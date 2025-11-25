'use client';

import type React from 'react';
import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface TimeRangeSelectorProps {
  selectedSlots: number[]; // 선택된 시간 슬롯들 (0-23)
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

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const slotHeight = 48;

  const formatHour = (hour: number): string => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, hour: number) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();

      setIsDragging(true);
      setDragStartIdx(hour);
      setDragEndIdx(hour);
      setDragTargetSelected(!selectedSlots.includes(hour));
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [disabled, selectedSlots]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !containerRef.current) return;
      e.preventDefault();

      const rect = containerRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const hour = Math.max(0, Math.min(23, Math.floor(y / slotHeight)));
      setDragEndIdx(hour);
    },
    [isDragging, slotHeight]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || dragStartIdx === null || dragEndIdx === null) {
        setIsDragging(false);
        return;
      }
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      const start = Math.min(dragStartIdx, dragEndIdx);
      const end = Math.max(dragStartIdx, dragEndIdx);

      const newSlots = new Set(selectedSlots);
      for (let i = start; i <= end; i++) {
        if (dragTargetSelected) {
          newSlots.add(i);
        } else {
          newSlots.delete(i);
        }
      }

      onSlotsChange(Array.from(newSlots).sort((a, b) => a - b));

      setIsDragging(false);
      setDragStartIdx(null);
      setDragEndIdx(null);
    },
    [
      isDragging,
      dragStartIdx,
      dragEndIdx,
      dragTargetSelected,
      selectedSlots,
      onSlotsChange,
    ]
  );

  // 드래그 중 하이라이트 계산
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
        // 시작 시간 ~ 종료 시간+1 형식으로 표시 (00:00 - 01:00)
        ranges.push(
          `${formatHour(start)} - ${formatHour(
            end + 1 > 23 ? 24 : end + 1
          ).replace('24:00', '24:00')}`
        );
        if (i < sorted.length) {
          start = sorted[i];
          end = sorted[i];
        }
      }
    }

    return ranges.join(', ');
  };

  return (
    <div className="relative w-full">
      <div
        ref={containerRef}
        className={cn(
          'relative border rounded-lg overflow-hidden bg-muted/20',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        style={{ height: `${24 * slotHeight}px` }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* 시간 레이블 - 1시부터 23시까지 경계선에 표시 */}
        {Array.from({ length: 23 }).map((_, idx) => {
          const hour = idx + 1;
          return (
            <div
              key={`time-label-${hour}`}
              className="absolute left-0 w-14 flex items-center justify-end pr-2 pointer-events-none z-10"
              style={{ top: `${hour * slotHeight - 8}px` }}
            >
              <span className="text-xs font-medium text-muted-foreground bg-background/80 px-1 rounded">
                {formatHour(hour)}
              </span>
            </div>
          );
        })}

        {/* 시간 슬롯들 - 24개 (0~23시) */}
        <div className="absolute left-14 right-0 top-0 bottom-0">
          {hours.map((hour) => {
            const state = getSlotState(hour);
            const isSelected = state === 'selected' || state === 'drag-select';
            const isDragHighlight =
              state === 'drag-select' || state === 'drag-deselect';

            return (
              <div
                key={hour}
                className={cn(
                  'absolute left-0 right-0 border-t border-border/40 transition-colors',
                  isSelected ? 'bg-primary/30' : 'hover:bg-accent/40',
                  isDragHighlight && 'ring-2 ring-primary ring-inset',
                  !disabled && 'cursor-pointer'
                )}
                style={{
                  top: `${hour * slotHeight}px`,
                  height: `${slotHeight}px`,
                }}
                onPointerDown={(e) => handlePointerDown(e, hour)}
              >
                {isSelected && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary">
                      선택됨
                    </span>
                  </div>
                )}
              </div>
            );
          })}
          {/* 마지막 경계선 */}
          <div
            className="absolute left-0 right-0 border-t border-border/40"
            style={{ top: `${24 * slotHeight}px` }}
          />
        </div>
      </div>

      {/* 선택된 시간대 표시 */}
      <div className="mt-3 p-3 rounded-lg bg-muted/30">
        <div className="text-sm font-medium text-foreground mb-1">
          선택된 시간대
        </div>
        <div className="text-sm text-muted-foreground">
          {getSelectedRangesText()}
        </div>
      </div>
    </div>
  );
}

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

  // 기존 시작-종료 범위를 슬롯 배열로 변환
  const selectedSlots: number[] = [];
  for (let i = startHour; i < endHour; i++) {
    selectedSlots.push(i);
  }

  const handleSlotsChange = (slots: number[]) => {
    if (slots.length === 0) return;
    const sorted = [...slots].sort((a, b) => a - b);
    const newStart = sorted[0];
    const newEnd = sorted[sorted.length - 1] + 1;
    onStartTimeChange(`${newStart.toString().padStart(2, '0')}:00`);
    onEndTimeChange(`${Math.min(24, newEnd).toString().padStart(2, '0')}:00`);
  };

  return (
    <TimeRangeSelector
      selectedSlots={selectedSlots}
      onSlotsChange={handleSlotsChange}
      disabled={disabled}
    />
  );
}
