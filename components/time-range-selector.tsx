'use client';

import type React from 'react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { CalendarDays } from 'lucide-react';

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

  // Switch 토글 (사전 설정 — 클로저에서 항상 최신값 사용 가능)
  const [dragToggle, setDragToggle] = useState(false);
  // 롱프레스 폴백용 상태 (토글 OFF일 때 사용)
  const [isMobileDragMode, setIsMobileDragMode] = useState(false);

  // React state 배치 업데이트 타이밍 문제 우회용 ref
  // (meeting-calendar의 monthDragRef 패턴과 동일)
  const isDraggingRef = useRef(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const slotHeight = 48;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const formatHour = (hour: number) => `${hour.toString().padStart(2, '0')}:00`;

  const getHourFromY = useCallback((clientY: number): number => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    // getBoundingClientRect()는 뷰포트 기준, clientY도 뷰포트 기준이므로 스크롤 보정 불필요
    const y = clientY - rect.top;
    return Math.max(0, Math.min(23, Math.floor(y / slotHeight)));
  }, [slotHeight]);

  // ── PC 포인터 드래그 ───────────────────────────────────────────────────────
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

  // ── 모바일 단일 탭 ─────────────────────────────────────────────────────────
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

  // ── 모바일 터치 드래그 ─────────────────────────────────────────────────────
  // meeting-calendar의 day view 터치 드래그 패턴과 동일한 방식:
  // - isDraggingRef(ref)로 동기 상태 추적 → handleTouchMove 클로저 타이밍 문제 해결
  // - dragToggle(사전 설정 state)로 touch-none 적용 → 페이지 스크롤 방지
  const handleTouchStart = useCallback(
    (e: React.TouchEvent, hour: number) => {
      if (disabled || !isMobile) return;

      if (dragToggle) {
        // 토글 ON: 즉시 드래그 시작 (ref로 동기 설정)
        isDraggingRef.current = true;
        setIsDragging(true);
        setDragStartIdx(hour);
        setDragEndIdx(hour);
        setDragTargetSelected(!selectedSlots.includes(hour));
      } else {
        // 토글 OFF: 롱프레스 400ms 후 드래그 모드 진입
        longPressTimerRef.current = setTimeout(() => {
          isDraggingRef.current = true;
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
      // ref를 체크해 state 타이밍 문제 우회 (meeting-calendar 패턴)
      if (!isDraggingRef.current) return;
      e.preventDefault(); // 드래그 중 페이지 스크롤 차단
      const touch = e.touches[0];
      const hour = getHourFromY(touch.clientY);
      setDragEndIdx(hour);
    },
    [getHourFromY]
  );

  const handleTouchEnd = useCallback(
    (_e: React.TouchEvent) => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      if (isDraggingRef.current && dragStartIdx !== null && dragEndIdx !== null) {
        const start = Math.min(dragStartIdx, dragEndIdx);
        const end = Math.max(dragStartIdx, dragEndIdx);
        const newSlots = new Set(selectedSlots);
        for (let i = start; i <= end; i++) {
          if (dragTargetSelected) newSlots.add(i);
          else newSlots.delete(i);
        }
        onSlotsChange(Array.from(newSlots).sort((a, b) => a - b));
      }

      isDraggingRef.current = false;
      setIsDragging(false);
      // 토글 ON이면 드래그 모드 유지 (다음 터치도 즉시 드래그)
      if (!dragToggle) setIsMobileDragMode(false);
      setDragStartIdx(null);
      setDragEndIdx(null);
    },
    [dragToggle, dragStartIdx, dragEndIdx, dragTargetSelected, selectedSlots, onSlotsChange]
  );

  const handleDragToggleChange = (checked: boolean) => {
    setDragToggle(checked);
    if (!checked) {
      isDraggingRef.current = false;
      setIsMobileDragMode(false);
      setIsDragging(false);
      setDragStartIdx(null);
      setDragEndIdx(null);
    }
  };

  const getSlotState = (hour: number): 'selected' | 'unselected' | 'drag-select' | 'drag-deselect' => {
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

  return (
    <div className="relative w-full">
      {/* 모바일 전용 다중 선택 토글 (meeting-calendar day view와 동일한 floating pill 스타일) */}
      {isMobile && (
        <div className={cn(
          'sm:hidden fixed bottom-20 right-4 z-50',
          'flex items-center gap-2 px-3 py-2 rounded-full shadow-lg border',
          dragToggle
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-background text-foreground border-border'
        )}>
          <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="text-xs font-medium whitespace-nowrap">다중 선택</span>
          <Switch
            checked={dragToggle}
            onCheckedChange={handleDragToggleChange}
            className="scale-75"
          />
        </div>
      )}

      <div
        ref={containerRef}
        className={cn(
          'relative border border-border/60 rounded-xl overflow-hidden bg-muted/10',
          disabled && 'opacity-50 cursor-not-allowed',
          // dragToggle은 사전 설정 state → 타이밍 문제 없이 touch-none 즉시 적용
          // (페이지 스크롤 방지, meeting-calendar의 dayDragMode ? 'touch-none' 패턴과 동일)
          (dragToggle || isMobileDragMode) && 'touch-none'
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
                onClick={() => isMobile && handleSlotTap(hour)}
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

      {/* 선택된 시간대 요약 */}
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
