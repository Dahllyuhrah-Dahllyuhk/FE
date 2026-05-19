'use client';

import type React from 'react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

interface TimeRangeSelectorProps {
  selectedSlots: number[];
  onSlotsChange: (slots: number[]) => void;
  disabled?: boolean;
}

export function TimeRangeSelector({
  selectedSlots,
  onSlotsChange,
  disabled = false,
}: TimeRangeSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartIdx, setDragStartIdx] = useState<number | null>(null);
  const [dragEndIdx, setDragEndIdx] = useState<number | null>(null);
  const [dragTargetSelected, setDragTargetSelected] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState(false);

  // 모바일 드래그 토글 (Switch로 즉시 활성화) + 롱프레스 폴백
  const [dragToggle, setDragToggle] = useState(false);
  const [isMobileDragMode, setIsMobileDragMode] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartHourRef = useRef<number | null>(null);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const slotHeight = 48;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const formatHour = (hour: number): string => `${hour.toString().padStart(2, '0')}:00`;

  const getHourFromY = useCallback((clientY: number): number => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const y = clientY - rect.top;
    return Math.max(0, Math.min(23, Math.floor(y / slotHeight)));
  }, [slotHeight]);

  // ── PC 드래그 ──────────────────────────────────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent, hour: number) => {
      if (disabled || isMobile) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      setDragStartIdx(hour);
      setDragEndIdx(hour);
      setDragTargetSelected(!selectedSlots.includes(hour));
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [disabled, selectedSlots, isMobile]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !containerRef.current || isMobile) return;
      e.preventDefault();
      const rect = containerRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const hour = Math.max(0, Math.min(23, Math.floor(y / slotHeight)));
      setDragEndIdx(hour);
    },
    [isDragging, slotHeight, isMobile]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || dragStartIdx === null || dragEndIdx === null || isMobile) {
        setIsDragging(false);
        return;
      }
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      const start = Math.min(dragStartIdx, dragEndIdx);
      const end = Math.max(dragStartIdx, dragEndIdx);
      const newSlots = new Set(selectedSlots);
      for (let i = start; i <= end; i++) {
        if (dragTargetSelected) newSlots.add(i);
        else newSlots.delete(i);
      }
      onSlotsChange(Array.from(newSlots).sort((a, b) => a - b));
      setIsDragging(false);
      setDragStartIdx(null);
      setDragEndIdx(null);
    },
    [isDragging, dragStartIdx, dragEndIdx, dragTargetSelected, selectedSlots, onSlotsChange, isMobile]
  );

  // ── 모바일 탭 (단일 선택) ────────────────────────────────────────────
  const handleSlotTap = useCallback(
    (hour: number) => {
      if (disabled || isMobileDragMode || dragToggle) return;
      const newSlots = new Set(selectedSlots);
      if (newSlots.has(hour)) newSlots.delete(hour);
      else newSlots.add(hour);
      onSlotsChange(Array.from(newSlots).sort((a, b) => a - b));
    },
    [disabled, selectedSlots, onSlotsChange, isMobileDragMode, dragToggle]
  );

  // ── 모바일 터치 드래그 ────────────────────────────────────────────────
  const handleTouchStart = useCallback(
    (e: React.TouchEvent, hour: number) => {
      if (disabled || !isMobile) return;
      touchStartHourRef.current = hour;

      if (dragToggle) {
        // 토글 ON: 즉시 드래그 모드 진입
        setIsMobileDragMode(true);
        setIsDragging(true);
        setDragStartIdx(hour);
        setDragEndIdx(hour);
        setDragTargetSelected(!selectedSlots.includes(hour));
      } else {
        // 토글 OFF: 롱프레스 400ms 후 드래그 모드 진입
        longPressTimerRef.current = setTimeout(() => {
          setIsMobileDragMode(true);
          setIsDragging(true);
          setDragStartIdx(hour);
          setDragEndIdx(hour);
          setDragTargetSelected(!selectedSlots.includes(hour));
          if (navigator.vibrate) navigator.vibrate(30);
        }, 400);
      }
    },
    [disabled, isMobile, dragToggle, selectedSlots]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isMobileDragMode || !isDragging) return;
      e.preventDefault(); // 스크롤 차단 (드래그 모드에서만)
      const touch = e.touches[0];
      const hour = getHourFromY(touch.clientY);
      setDragEndIdx(hour);
    },
    [isMobileDragMode, isDragging, getHourFromY]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      if (isMobileDragMode && isDragging && dragStartIdx !== null && dragEndIdx !== null) {
        const start = Math.min(dragStartIdx, dragEndIdx);
        const end = Math.max(dragStartIdx, dragEndIdx);
        const newSlots = new Set(selectedSlots);
        for (let i = start; i <= end; i++) {
          if (dragTargetSelected) newSlots.add(i);
          else newSlots.delete(i);
        }
        onSlotsChange(Array.from(newSlots).sort((a, b) => a - b));
      }

      setIsDragging(false);
      // 토글 ON이면 드래그 모드 유지 (다음 터치도 즉시 드래그)
      if (!dragToggle) setIsMobileDragMode(false);
      setDragStartIdx(null);
      setDragEndIdx(null);
      touchStartHourRef.current = null;
    },
    [isMobileDragMode, isDragging, dragStartIdx, dragEndIdx, dragTargetSelected, selectedSlots, onSlotsChange, dragToggle]
  );

  const getSlotState = (
    hour: number
  ): 'selected' | 'unselected' | 'drag-select' | 'drag-deselect' => {
    if (isDragging && dragStartIdx !== null && dragEndIdx !== null) {
      const start = Math.min(dragStartIdx, dragEndIdx);
      const end = Math.max(dragStartIdx, dragEndIdx);
      if (hour >= start && hour <= end) {
        return dragTargetSelected ? 'drag-select' : 'drag-deselect';
      }
    }
    return selectedSlots.includes(hour) ? 'selected' : 'unselected';
  };

  const getSelectedRangesText = () => {
    if (selectedSlots.length === 0) return '선택된 시간대 없음';
    const sorted = [...selectedSlots].sort((a, b) => a - b);
    const ranges: string[] = [];
    let start = sorted[0];
    let end = sorted[0];
    for (let i = 1; i <= sorted.length; i++) {
      if (i < sorted.length && sorted[i] === end + 1) {
        end = sorted[i];
      } else {
        ranges.push(`${formatHour(start)} - ${end + 1 > 23 ? '24:00' : formatHour(end + 1)}`);
        if (i < sorted.length) { start = sorted[i]; end = sorted[i]; }
      }
    }
    return ranges.join(', ');
  };

  const handleDragToggleChange = (checked: boolean) => {
    setDragToggle(checked);
    if (!checked) {
      setIsMobileDragMode(false);
      setIsDragging(false);
      setDragStartIdx(null);
      setDragEndIdx(null);
    }
  };

  return (
    <div className="relative w-full">
      {/* 모바일 다중 선택 토글 (floating pill) */}
      {isMobile && (
        <div className="sm:hidden fixed bottom-20 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full bg-background shadow-lg border border-border/60">
          <span className="text-xs text-muted-foreground">다중 선택</span>
          <Switch
            checked={dragToggle}
            onCheckedChange={handleDragToggleChange}
          />
        </div>
      )}

      <div
        ref={containerRef}
        className={cn(
          'relative border border-border/60 rounded-xl overflow-hidden bg-muted/10',
          disabled && 'opacity-50 cursor-not-allowed',
          isMobileDragMode && 'touch-none'
        )}
        style={{ height: `${24 * slotHeight}px` }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={!isMobile ? handlePointerUp : undefined}
      >
        {/* 시간 레이블 */}
        {Array.from({ length: 23 }).map((_, idx) => {
          const hour = idx + 1;
          return (
            <div
              key={`time-label-${hour}`}
              className="absolute left-0 w-14 flex items-center justify-end pr-2 pointer-events-none z-10"
              style={{ top: `${hour * slotHeight - 8}px` }}
            >
              <span className="text-xs font-medium text-muted-foreground/80 bg-background/80 px-1 rounded">
                {formatHour(hour)}
              </span>
            </div>
          );
        })}

        {/* 시간 슬롯 */}
        <div className="absolute left-14 right-0 top-0 bottom-0">
          {hours.map((hour) => {
            const state = getSlotState(hour);
            const isSelected = state === 'selected' || state === 'drag-select';
            const isDragHighlight = state === 'drag-select' || state === 'drag-deselect';

            return (
              <div
                key={hour}
                className={cn(
                  'absolute left-0 right-0 border-t border-border/30 transition-colors select-none',
                  isSelected ? 'bg-primary/25' : 'hover:bg-accent/50',
                  isDragHighlight && 'ring-1 ring-primary ring-inset',
                  !disabled && 'cursor-pointer'
                )}
                style={{ top: `${hour * slotHeight}px`, height: `${slotHeight}px` }}
                onPointerDown={(e) => handlePointerDown(e, hour)}
                onClick={() => isMobile && !isMobileDragMode && handleSlotTap(hour)}
                onTouchStart={(e) => handleTouchStart(e, hour)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-semibold text-primary/80">✓</span>
                  </div>
                )}
              </div>
            );
          })}
          <div className="absolute left-0 right-0 border-t border-border/30" style={{ top: `${24 * slotHeight}px` }} />
        </div>
      </div>

      {/* 선택된 시간대 */}
      <div className="mt-3 px-4 py-3 rounded-xl bg-muted/30 border border-border/40">
        <div className="text-xs font-medium text-foreground/60 mb-1">선택된 시간대</div>
        <div className="text-sm text-foreground/80">{getSelectedRangesText()}</div>
      </div>
    </div>
  );
}

/* ── LegacyTimeRangeSelector (하위호환) ────────────────────────────── */
interface LegacyTimeRangeSelectorProps {
  startTime: string;
  endTime: string;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  disabled?: boolean;
}

export function LegacyTimeRangeSelector({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  disabled = false,
}: LegacyTimeRangeSelectorProps) {
  const parseTime = (time: string): number => {
    const [hour] = time.split(':').map(Number);
    return hour;
  };
  const startHour = parseTime(startTime);
  const endHour = parseTime(endTime);
  const selectedSlots: number[] = [];
  for (let i = startHour; i < endHour; i++) selectedSlots.push(i);

  const handleSlotsChange = (slots: number[]) => {
    if (slots.length === 0) return;
    const sorted = [...slots].sort((a, b) => a - b);
    onStartTimeChange(`${sorted[0].toString().padStart(2, '0')}:00`);
    onEndTimeChange(`${Math.min(24, sorted[sorted.length - 1] + 1).toString().padStart(2, '0')}:00`);
  };

  return (
    <TimeRangeSelector
      selectedSlots={selectedSlots}
      onSlotsChange={handleSlotsChange}
      disabled={disabled}
    />
  );
}
