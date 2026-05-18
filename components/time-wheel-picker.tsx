'use client';

import type React from 'react';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface TimeWheelPickerProps {
  value: string; // "HH:mm" format
  onChange: (time: string) => void;
  minTime?: string; // "HH:mm" format
  maxTime?: string; // "HH:mm" format
}

export function TimeWheelPicker({
  value,
  onChange,
  minTime = '06:00',
  maxTime = '23:50',
}: TimeWheelPickerProps) {
  const [hours, minutes] = value.split(':').map(Number);
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);

  // Track if the update is coming from a scroll event to prevent feedback loops
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const dragStateRef = useRef<{
    isDragging: boolean;
    startY: number;
    startScrollTop: number;
    ref: React.RefObject<HTMLDivElement | null> | null;
  }>({
    isDragging: false,
    startY: 0,
    startScrollTop: 0,
    ref: null,
  });

  const [minHour, minMinute] = minTime.split(':').map(Number);
  const [maxHour, maxMinute] = maxTime.split(':').map(Number);

  const hourOptions = Array.from(
    { length: maxHour - minHour + 1 },
    (_, i) => minHour + i
  );
  const minuteOptions = Array.from({ length: 6 }, (_, i) => i * 10);

  // Helper to handle wheel events for precise 1-step movement
  const handleWheel = (
    e: WheelEvent,
    ref: React.RefObject<HTMLDivElement | null>,
    type: 'hour' | 'minute'
  ) => {
    if (!ref.current) return;
    e.preventDefault();

    const itemHeight = 36;
    const direction = e.deltaY > 0 ? 1 : -1;
    const currentScroll = ref.current.scrollTop;
    const targetScroll =
      Math.round(currentScroll / itemHeight) * itemHeight +
      direction * itemHeight;

    ref.current.scrollTo({
      top: targetScroll,
      behavior: 'smooth',
    });
  };

  // Attach wheel listeners
  useEffect(() => {
    const hourEl = hourRef.current;
    const minuteEl = minuteRef.current;

    const onHourWheel = (e: WheelEvent) => handleWheel(e, hourRef, 'hour');
    const onMinuteWheel = (e: WheelEvent) =>
      handleWheel(e, minuteRef, 'minute');

    if (hourEl)
      hourEl.addEventListener('wheel', onHourWheel, { passive: false });
    if (minuteEl)
      minuteEl.addEventListener('wheel', onMinuteWheel, { passive: false });

    return () => {
      if (hourEl) hourEl.removeEventListener('wheel', onHourWheel);
      if (minuteEl) minuteEl.removeEventListener('wheel', onMinuteWheel);
    };
  }, []);

  useEffect(() => {
    if (
      hourRef.current &&
      !isScrollingRef.current &&
      !dragStateRef.current.isDragging
    ) {
      const selectedIndex = hourOptions.indexOf(hours);
      if (selectedIndex !== -1) {
        const itemHeight = 36;
        if (
          Math.abs(hourRef.current.scrollTop - selectedIndex * itemHeight) > 1
        ) {
          hourRef.current.scrollTo({
            top: selectedIndex * itemHeight,
            behavior: 'smooth',
          });
        }
      }
    }
  }, [hours, hourOptions]);

  useEffect(() => {
    if (
      minuteRef.current &&
      !isScrollingRef.current &&
      !dragStateRef.current.isDragging
    ) {
      const selectedIndex = minuteOptions.indexOf(minutes);
      if (selectedIndex !== -1) {
        const itemHeight = 36;
        if (
          Math.abs(minuteRef.current.scrollTop - selectedIndex * itemHeight) > 1
        ) {
          minuteRef.current.scrollTo({
            top: selectedIndex * itemHeight,
            behavior: 'smooth',
          });
        }
      }
    }
  }, [minutes, minuteOptions]);

  const handleScroll = (type: 'hour' | 'minute', element: HTMLDivElement) => {
    isScrollingRef.current = true;

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
      const itemHeight = 36;
      const scrollTop = element.scrollTop;
      const finalIndex = Math.round(scrollTop / itemHeight);
      const targetScroll = finalIndex * itemHeight;

      if (Math.abs(scrollTop - targetScroll) > 1) {
        element.scrollTo({ top: targetScroll, behavior: 'smooth' });
      }
    }, 150);

    const itemHeight = 36;
    const scrollTop = element.scrollTop;
    const centerIndex = Math.round(scrollTop / itemHeight);

    if (type === 'hour') {
      const newHour = hourOptions[centerIndex];
      if (newHour !== undefined && newHour !== hours) {
        onChange(
          `${newHour.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}`
        );
      }
    } else {
      const newMinute = minuteOptions[centerIndex];
      if (newMinute !== undefined && newMinute !== minutes) {
        onChange(
          `${hours.toString().padStart(2, '0')}:${newMinute
            .toString()
            .padStart(2, '0')}`
        );
      }
    }
  };

  // 2. handleMouseDown 매개변수 타입 수정
  const handleMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    ref: React.RefObject<HTMLDivElement | null>
  ) => {
    if (!ref.current) return;
    dragStateRef.current = {
      isDragging: true,
      startY: e.clientY,
      startScrollTop: ref.current.scrollTop,
      ref: ref,
    };
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragStateRef.current.isDragging || !dragStateRef.current.ref?.current)
      return;
    const deltaY = dragStateRef.current.startY - e.clientY;
    dragStateRef.current.ref.current.scrollTop =
      dragStateRef.current.startScrollTop + deltaY;
  };

  const handleMouseUp = () => {
    if (dragStateRef.current.isDragging) {
      dragStateRef.current.isDragging = false;
      setTimeout(() => {
        dragStateRef.current.ref = null;
      }, 50);
    }
  };

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div className="flex items-center justify-center gap-4">
      {/* Hour Wheel */}
      <div className="relative h-[108px] w-24 overflow-hidden rounded-lg">
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="absolute top-0 left-0 right-0 h-9 bg-gradient-to-b from-background via-background/80 to-transparent" />
          <div className="absolute top-[36px] left-0 right-0 h-9 bg-muted/10 rounded-md" />
          <div className="absolute bottom-0 left-0 right-0 h-9 bg-gradient-to-t from-background via-background/80 to-transparent" />
        </div>
        <div
          ref={hourRef}
          className="h-full overflow-y-scroll scrollbar-hide snap-y snap-mandatory py-[36px] cursor-grab active:cursor-grabbing select-none"
          onScroll={(e) => handleScroll('hour', e.currentTarget)}
          onMouseDown={(e) => handleMouseDown(e, hourRef)}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {hourOptions.map((hour) => (
            <div
              key={hour}
              className={cn(
                'h-9 flex items-center justify-center text-xl font-semibold snap-center transition-all duration-200 cursor-pointer',
                hour === hours
                  ? 'text-foreground scale-100 opacity-100'
                  : 'text-muted-foreground/40 scale-75 opacity-60'
              )}
              onClick={() => {
                isScrollingRef.current = true;
                onChange(
                  `${hour.toString().padStart(2, '0')}:${minutes
                    .toString()
                    .padStart(2, '0')}`
                );
                setTimeout(() => {
                  isScrollingRef.current = false;
                }, 100);
              }}
            >
              {hour.toString().padStart(2, '0')}
            </div>
          ))}
        </div>
      </div>

      <div className="text-2xl font-bold text-muted-foreground/60">:</div>

      {/* Minute Wheel */}
      <div className="relative h-[108px] w-24 overflow-hidden rounded-lg">
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="absolute top-0 left-0 right-0 h-9 bg-gradient-to-b from-background via-background/80 to-transparent" />
          <div className="absolute top-[36px] left-0 right-0 h-9 bg-muted/10 rounded-md" />
          <div className="absolute bottom-0 left-0 right-0 h-9 bg-gradient-to-t from-background via-background/80 to-transparent" />
        </div>
        <div
          ref={minuteRef}
          className="h-full overflow-y-scroll scrollbar-hide snap-y snap-mandatory py-[36px] cursor-grab active:cursor-grabbing select-none"
          onScroll={(e) => handleScroll('minute', e.currentTarget)}
          onMouseDown={(e) => handleMouseDown(e, minuteRef)}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {minuteOptions.map((minute) => (
            <div
              key={minute}
              className={cn(
                'h-9 flex items-center justify-center text-xl font-semibold snap-center transition-all duration-200 cursor-pointer',
                minute === minutes
                  ? 'text-foreground scale-100 opacity-100'
                  : 'text-muted-foreground/40 scale-75 opacity-60'
              )}
              onClick={() => {
                isScrollingRef.current = true;
                onChange(
                  `${hours.toString().padStart(2, '0')}:${minute
                    .toString()
                    .padStart(2, '0')}`
                );
                setTimeout(() => {
                  isScrollingRef.current = false;
                }, 100);
              }}
            >
              {minute.toString().padStart(2, '0')}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
