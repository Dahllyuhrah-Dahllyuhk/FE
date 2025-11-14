'use client';

import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { buildMonthGrid } from '@/lib/calendar-utils'; // Import buildMonthGrid function

/* ===== 로컬 타입 (외부 의존 제거) ===== */
export type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  allDay?: boolean;
  color: string;
};

/* ===== 유틸 ===== */
const MS_DAY = 24 * 60 * 60 * 1000;
const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const addMonths = (d: Date, n: number) => {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
};
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;

const isMultiDayEvent = (evt: CalendarEvent): boolean => {
  if (!evt.allDay) return false;
  const s = startOfDay(new Date(evt.startDate));
  const e = startOfDay(new Date(evt.endDate));
  return e.getTime() > s.getTime();
};

const assignRowsToMultiDayEvents = (
  events: CalendarEvent[],
  weekStart: Date
): Map<string, { row: number; event: CalendarEvent }> => {
  const rows: CalendarEvent[][] = [];
  const eventToRow = new Map<string, { row: number; event: CalendarEvent }>();

  const weekEnd = addDays(weekStart, 6);

  const multiDayEvents = events
    .filter((evt) => {
      if (!isMultiDayEvent(evt)) return false;
      const s = startOfDay(new Date(evt.startDate));
      const e = startOfDay(new Date(evt.endDate));
      // 이 주와 겹치는지 확인
      return s <= weekEnd && e >= startOfDay(weekStart);
    })
    .sort((a, b) => {
      const diff = a.startDate.getTime() - b.startDate.getTime();
      if (diff !== 0) return diff;
      return b.endDate.getTime() - a.endDate.getTime(); // 긴 이벤트가 먼저
    });

  for (const event of multiDayEvents) {
    const s = startOfDay(new Date(event.startDate));
    const e = startOfDay(new Date(event.endDate));

    // 빈 row 찾기
    let assignedRow = -1;
    for (let i = 0; i < rows.length; i++) {
      const rowEvents = rows[i];
      // 이 row에 겹치는 이벤트가 있는지 확인
      const hasOverlap = rowEvents.some((existing) => {
        const es = startOfDay(new Date(existing.startDate));
        const ee = startOfDay(new Date(existing.endDate));
        return s <= ee && e >= es;
      });
      if (!hasOverlap) {
        assignedRow = i;
        break;
      }
    }

    // 빈 row가 없으면 새로 만들기
    if (assignedRow === -1) {
      assignedRow = rows.length;
      rows.push([]);
    }

    rows[assignedRow].push(event);
    eventToRow.set(event.id, { row: assignedRow, event });
  }

  return eventToRow;
};

/* ===== Props ===== */
type Props = {
  events: CalendarEvent[];
  onEventDoubleClick: (event: CalendarEvent) => void;
  onDateRangeSelect: (start: Date, end: Date) => void;
  onCreateNewEvent?: (date: Date) => void;
};

/* ===== 컴포넌트 ===== */
export function Calendar({
  events,
  onEventDoubleClick,
  onDateRangeSelect,
  onCreateNewEvent,
}: Props) {
  // 상태
  const [currentDate, setCurrentDate] = useState<Date>(new Date()); // 가운데(기준) 달
  const [displayMonths, setDisplayMonths] = useState<Date[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [bottomSheetEvents, setBottomSheetEvents] = useState<CalendarEvent[]>(
    []
  );
  const bottomSheetOpenRef = useRef(false);

  // 드래그(포인터) 상태
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<Date | null>(null);
  const [dragEnd, setDragEnd] = useState<Date | null>(null);

  // 성능 파라미터
  const INITIAL_BEFORE = 2; // 현재 달 기준 앞쪽 렌더 개월
  const INITIAL_AFTER = 2; // 현재 달 기준 뒤쪽 렌더 개월
  const LOAD_CHUNK = 1; // 스크롤 시 한 번에 추가할 개월

  // refs
  const containerRef = useRef<HTMLDivElement>(null);
  const monthRefs = useRef<Map<string, HTMLDivElement>>(new Map()); // 각 달 Card ref
  const isUpdatingScrollRef = useRef(false);
  const isMobile = useIsMobile();

  /* 1) 초기 월 윈도우 만들기 (데이터 fetching 제거) */
  useEffect(() => {
    const now = new Date();
    const months: Date[] = [];
    for (let i = -INITIAL_BEFORE; i <= INITIAL_AFTER; i++) {
      months.push(new Date(now.getFullYear(), now.getMonth() + i, 1));
    }
    setDisplayMonths(months);
    setCurrentDate(now);
  }, []);

  /* 2) 현재 달 카드로 스크롤(초기 위치를 가운데로) → 위/아래 확장 가능 */
  useEffect(() => {
    if (!isInitialLoad || displayMonths.length === 0) return;

    const key = monthKey(currentDate);
    const el = monthRefs.current.get(key);
    if (el && containerRef.current) {
      el.scrollIntoView({ block: 'start', behavior: 'auto' });
      containerRef.current.scrollTop += 16; // top trigger 여유
      setIsInitialLoad(false);
    }
  }, [displayMonths, currentDate, isInitialLoad]);

  /* 3) prev/next 버튼 */
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  /* 4) 스크롤로 월 동적 추가 */
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isUpdatingScrollRef.current) {
      return;
    }

    const container = e.currentTarget;
    const scrollTop = container.scrollTop;

    if (displayMonths.length === 0) return;

    // 상단 가까우면 이전 달 추가
    if (scrollTop < 120) {
      isUpdatingScrollRef.current = true;

      const first = displayMonths[0];
      const toAdd: Date[] = [];
      for (let i = LOAD_CHUNK; i >= 1; i--) {
        const m = addMonths(first, -i);
        if (!displayMonths.some((d) => monthKey(d) === monthKey(m)))
          toAdd.push(m);
      }

      if (toAdd.length > 0) {
        console.log('[v0] Adding previous months:', toAdd.length);
        const previousScrollHeight = container.scrollHeight;

        setDisplayMonths((prev) => [...toAdd, ...prev]);

        // DOM 업데이트 후 스크롤 위치 보정
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const newScrollHeight = container.scrollHeight;
            const heightDiff = newScrollHeight - previousScrollHeight;
            container.scrollTop = scrollTop + heightDiff;
            console.log('[v0] Adjusted scroll position by:', heightDiff);
            isUpdatingScrollRef.current = false;
          });
        });
      } else {
        isUpdatingScrollRef.current = false;
      }
    }

    // 하단 가까우면 다음 달 추가
    if (container.scrollHeight - scrollTop - container.clientHeight < 120) {
      const last = displayMonths[displayMonths.length - 1];
      const toAdd: Date[] = [];
      for (let i = 1; i <= LOAD_CHUNK; i++) {
        const m = addMonths(last, i);
        if (!displayMonths.some((d) => monthKey(d) === monthKey(m)))
          toAdd.push(m);
      }
      if (toAdd.length > 0) {
        console.log('[v0] Adding next months:', toAdd.length);
        setDisplayMonths((prev) => [...prev, ...toAdd]);
      }
    }
  };

  /* 5) 드래그(포인터)로 날짜 범위 선택 — 모바일/PC 공통 */
  useEffect(() => {
    const onPointerUp = () => {
      if (bottomSheetOpenRef.current) return;
      if (!isDragging) return;
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
    };
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [isDragging]);

  const isDateInDragRange = (date: Date) => {
    if (!isDragging || !dragStart || !dragEnd) return false;
    const s = startOfDay(dragStart < dragEnd ? dragStart : dragEnd);
    const e = endOfDay(dragStart < dragEnd ? dragEnd : dragStart);
    return date >= s && date <= e;
  };

  const beginDrag = (date: Date, el: HTMLElement, pointerId: number) => {
    if (bottomSheetOpenRef.current) return;
    setIsDragging(true);
    setDragStart(date);
    setDragEnd(date);
    el.style.touchAction = 'none'; // 스크롤 대신 드래그
    el.setPointerCapture?.(pointerId);
  };

  const extendDrag = (date: Date) => {
    if (isDragging) setDragEnd(date);
  };

  const endDrag = (el: HTMLElement, pointerId: number) => {
    el.releasePointerCapture?.(pointerId);
    el.style.touchAction = '';
    if (isDragging && dragStart && dragEnd) {
      const s = dragStart < dragEnd ? dragStart : dragEnd;
      const d = dragStart < dragEnd ? dragEnd : dragStart;
      onDateRangeSelect(startOfDay(s), endOfDay(d));
    }
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  /* 6) 월 렌더 */
  const renderMonth = (date: Date) => {
    const y = date.getFullYear();
    const m = date.getMonth();
    const grid = buildMonthGrid(y, m);

    const MAX_VISIBLE_EVENTS = 3;

    return (
      <Card
        key={monthKey(date)}
        ref={(el) => {
          if (el) monthRefs.current.set(monthKey(date), el);
          else monthRefs.current.delete(monthKey(date));
        }}
        className="overflow-hidden shadow-lg select-none mb-4"
      >
        {/* 헤더 (현재 가운데 월일 때만 좌우 버튼) */}
        <div className="flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5 p-4">
          {date.getMonth() === currentDate.getMonth() &&
          date.getFullYear() === currentDate.getFullYear() ? (
            <>
              {!isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={prevMonth}
                  className="hover:bg-primary/10"
                  aria-label="prev"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}
              <h2 className="text-lg font-bold text-foreground flex-1 text-center">
                {y}년 {m + 1}월
              </h2>
              {!isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={nextMonth}
                  className="hover:bg-primary/10"
                  aria-label="next"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              )}
            </>
          ) : (
            <h2 className="text-lg font-bold text-foreground flex-1 text-center">
              {y}년 {m + 1}월
            </h2>
          )}
        </div>

        <div className="p-4">
          {/* 요일 라벨 */}
          <div className="mb-3 grid grid-cols-7 gap-1 text-center">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
              <div
                key={day}
                className={`text-sm font-bold ${
                  idx === 0
                    ? 'text-red-500'
                    : idx === 6
                    ? 'text-blue-500'
                    : 'text-muted-foreground'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* 주 단위 렌더 */}
          <div className="space-y-2">
            {grid.map((week, weekIdx) => {
              const weekStart = week.find((d) => d !== null) as Date;
              const eventToRow = assignRowsToMultiDayEvents(events, weekStart);

              return (
                <div key={`week-${weekIdx}`} className="relative">
                  {/* 날짜 셀 */}
                  <div className="grid grid-cols-7 gap-1">
                    {week.map((cellDate, colIdx) => {
                      if (!cellDate) return <div key={`empty-${colIdx}`} />;

                      const now = new Date();
                      const today = isSameDay(cellDate, now);
                      const inDrag = isDateInDragRange(cellDate);

                      const cellStart = startOfDay(cellDate);
                      const cellEnd = endOfDay(cellDate);

                      const multiDayEventsForCell: {
                        event: CalendarEvent;
                        row: number;
                        isStart: boolean;
                      }[] = [];
                      eventToRow.forEach(({ row, event }) => {
                        const s = startOfDay(new Date(event.startDate));
                        if (isSameDay(s, cellDate)) {
                          multiDayEventsForCell.push({
                            event,
                            row,
                            isStart: true,
                          });
                        }
                      });

                      const singleDayAllDayEvents = events.filter(
                        (evt: CalendarEvent) => {
                          if (!evt.allDay || isMultiDayEvent(evt)) return false;
                          const s = startOfDay(new Date(evt.startDate));
                          return isSameDay(s, cellDate);
                        }
                      );

                      const timedSingles = events
                        .filter((evt: CalendarEvent) => {
                          if (evt.allDay) return false;
                          const s = startOfDay(new Date(evt.startDate));
                          const e = new Date(evt.endDate);
                          return (
                            isSameDay(s, cellDate) && isSameDay(e, cellDate)
                          );
                        })
                        .sort(
                          (a, b) =>
                            a.startDate.getTime() - b.startDate.getTime()
                        );

                      const allDayEventsForDate = [
                        ...multiDayEventsForCell.map((m) => m.event),
                        ...singleDayAllDayEvents,
                        ...timedSingles,
                      ];

                      const totalMultiDayCount = multiDayEventsForCell.length;
                      const allEventsCount =
                        totalMultiDayCount +
                        singleDayAllDayEvents.length +
                        timedSingles.length;
                      const maxMultiDayRows =
                        Math.max(
                          ...multiDayEventsForCell.map((m) => m.row),
                          -1
                        ) + 1;
                      const visibleMultiDay = Math.min(
                        maxMultiDayRows,
                        MAX_VISIBLE_EVENTS
                      );
                      const remainingSpace = Math.max(
                        0,
                        MAX_VISIBLE_EVENTS - visibleMultiDay
                      );
                      const visibleSingleDay = Math.min(
                        singleDayAllDayEvents.length,
                        remainingSpace
                      );
                      const remainingSpace2 = Math.max(
                        0,
                        remainingSpace - visibleSingleDay
                      );
                      const visibleTimed = Math.min(
                        timedSingles.length,
                        remainingSpace2
                      );
                      const hiddenCount =
                        allEventsCount -
                        visibleMultiDay -
                        visibleSingleDay -
                        visibleTimed;

                      return (
                        <div
                          key={cellDate.getTime()}
                          className={`relative min-h-[120px] cursor-pointer rounded-lg p-2 transition-all duration-200 ${
                            inDrag
                              ? 'bg-primary/20 shadow-sm'
                              : 'bg-card/50 hover:bg-accent/50 hover:shadow-md'
                          } ${
                            today
                              ? 'ring-2 ring-primary ring-offset-1 bg-primary/5'
                              : ''
                          }`}
                          onPointerDown={(
                            e: React.PointerEvent<HTMLDivElement>
                          ) => {
                            if (
                              (e.target as HTMLElement).closest(
                                '[data-event-clickable]'
                              )
                            ) {
                              return;
                            }
                            if (isMobile && allDayEventsForDate.length > 0) {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedDate(cellDate);
                              setBottomSheetEvents(allDayEventsForDate);
                              bottomSheetOpenRef.current = true;
                              return;
                            }
                            const el = e.currentTarget as HTMLElement;
                            el.setPointerCapture?.(e.pointerId);
                            beginDrag(cellDate, el, e.pointerId);
                          }}
                          onPointerEnter={() => {
                            extendDrag(cellDate);
                          }}
                          onPointerUp={(
                            e: React.PointerEvent<HTMLDivElement>
                          ) => {
                            if (bottomSheetOpenRef.current) return;
                            const el = e.currentTarget as HTMLElement;
                            endDrag(el, e.pointerId);
                          }}
                        >
                          <div
                            className={`text-sm font-semibold mb-1 ${
                              today ? 'text-primary' : 'text-foreground'
                            }`}
                          >
                            {cellDate.getDate()}
                          </div>

                          {isMobile && allDayEventsForDate.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {allDayEventsForDate
                                .slice(0, 6)
                                .map((evt, idx) => (
                                  <div
                                    key={`dot-${evt.id}-${idx}`}
                                    className={`${evt.color} w-2 h-2 rounded-full`}
                                    title={evt.title}
                                  />
                                ))}
                              {allDayEventsForDate.length > 6 && (
                                <div className="text-[10px] text-muted-foreground ml-1">
                                  +{allDayEventsForDate.length - 6}
                                </div>
                              )}
                            </div>
                          ) : (
                            <>
                              {multiDayEventsForCell
                                .filter((m) => m.row < visibleMultiDay)
                                .map(({ event: evt, row, isStart }) => {
                                  const s = startOfDay(new Date(evt.startDate));
                                  const e = startOfDay(new Date(evt.endDate));
                                  const dayOfWeek = cellDate.getDay();
                                  const remainingDaysInWeek = 6 - dayOfWeek;

                                  const totalDays =
                                    Math.floor(
                                      (e.getTime() - s.getTime()) / MS_DAY
                                    ) + 1;
                                  const daysToShow = Math.max(
                                    1,
                                    Math.min(totalDays, remainingDaysInWeek + 1)
                                  );

                                  const widthPercent = daysToShow * 100;
                                  const gapAdjustment = (daysToShow - 1) * 4;
                                  const topPosition = 32 + row * 22;

                                  return (
                                    <div
                                      key={`multi-${
                                        evt.id
                                      }-${cellDate.getTime()}`}
                                      data-event-clickable
                                      className={`${evt.color} absolute left-2 right-[-4px] rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-white shadow-sm transition-transform hover:scale-105 cursor-pointer z-10 flex items-center overflow-hidden whitespace-nowrap`}
                                      style={{
                                        width: `calc(${widthPercent}% + ${gapAdjustment}px)`,
                                        top: `${topPosition}px`,
                                      }}
                                      onClick={(
                                        e: React.MouseEvent<HTMLDivElement>
                                      ) => {
                                        e.stopPropagation();
                                        onEventDoubleClick(evt);
                                      }}
                                      title={`${evt.title}\n${new Date(
                                        evt.startDate
                                      ).toLocaleDateString()} ~ ${new Date(
                                        evt.endDate
                                      ).toLocaleDateString()}`}
                                    >
                                      <span className="truncate">
                                        {evt.title}
                                      </span>
                                    </div>
                                  );
                                })}

                              {visibleSingleDay > 0 && (
                                <div
                                  style={{
                                    marginTop: `${visibleMultiDay * 22 + 4}px`,
                                  }}
                                  className="space-y-0.5"
                                >
                                  {singleDayAllDayEvents
                                    .slice(0, visibleSingleDay)
                                    .map((evt) => (
                                      <div
                                        key={`allday-${evt.id}`}
                                        data-event-clickable
                                        className={`${evt.color} cursor-pointer truncate rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-white shadow-sm transition-transform hover:scale-105`}
                                        onClick={(
                                          e: React.MouseEvent<HTMLDivElement>
                                        ) => {
                                          e.stopPropagation();
                                          onEventDoubleClick(evt);
                                        }}
                                        title={`${evt.title} (종일)`}
                                      >
                                        {evt.title}
                                      </div>
                                    ))}
                                </div>
                              )}

                              {visibleTimed > 0 && (
                                <div
                                  className="space-y-0.5"
                                  style={{
                                    marginTop:
                                      visibleSingleDay > 0
                                        ? '4px'
                                        : `${visibleMultiDay * 22 + 4}px`,
                                  }}
                                >
                                  {timedSingles
                                    .slice(0, visibleTimed)
                                    .map((evt) => (
                                      <div
                                        key={`timed-${evt.id}`}
                                        data-event-clickable
                                        className={`cursor-pointer truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium text-foreground bg-muted hover:bg-muted/70 transition-colors`}
                                        onClick={(
                                          e: React.MouseEvent<HTMLDivElement>
                                        ) => {
                                          e.stopPropagation();
                                          onEventDoubleClick(evt);
                                        }}
                                        title={`${fmtTime(evt.startDate)} ${
                                          evt.title
                                        }`}
                                      >
                                        <span
                                          className="mr-1 inline-block h-2 w-2 rounded-full align-middle"
                                          style={{ background: 'currentColor' }}
                                        />
                                        <span className="align-middle text-xs font-semibold text-muted-foreground">
                                          {fmtTime(evt.startDate)}
                                        </span>{' '}
                                        <span className="align-middle">
                                          {evt.title}
                                        </span>
                                      </div>
                                    ))}
                                </div>
                              )}

                              {hiddenCount > 0 && (
                                <div
                                  className="text-[11px] text-muted-foreground px-1.5 cursor-pointer hover:text-foreground transition-colors mt-1"
                                  style={{
                                    marginTop: `${Math.max(
                                      visibleMultiDay * 22 + 4,
                                      36
                                    )}px`,
                                  }}
                                >
                                  +{hiddenCount} more
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    );
  };

  const fmtTime = (d: Date) =>
    new Intl.DateTimeFormat('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);

  return (
    <>
      <div
        ref={containerRef}
        className={`max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-hide ${
          isDragging ? 'touch-none select-none' : ''
        }`}
        onScroll={handleScroll}
      >
        {displayMonths.map((monthDate) => (
          <div key={monthKey(monthDate)}>{renderMonth(monthDate)}</div>
        ))}
      </div>

      {isMobile && selectedDate && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end animate-in fade-in duration-200"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedDate(null);
              setBottomSheetEvents([]);
              bottomSheetOpenRef.current = false;
            }
          }}
        >
          <div
            className="bg-background rounded-t-3xl w-full flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300"
            style={{
              maxHeight:
                bottomSheetEvents.length === 1
                  ? '55vh'
                  : bottomSheetEvents.length <= 3
                  ? '70vh'
                  : '85vh',
              minHeight:
                bottomSheetEvents.length === 1
                  ? '350px'
                  : bottomSheetEvents.length <= 3
                  ? '550px'
                  : '75vh',
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
              <h3 className="text-lg font-bold">
                {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedDate(null);
                    setBottomSheetEvents([]);
                    bottomSheetOpenRef.current = false;
                    if (onCreateNewEvent) {
                      onCreateNewEvent(selectedDate);
                    }
                  }}
                  title="새 일정 만들기"
                >
                  <Plus className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedDate(null);
                    setBottomSheetEvents([]);
                    bottomSheetOpenRef.current = false;
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 overscroll-contain">
              {bottomSheetEvents.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  일정이 없습니다
                </p>
              ) : (
                bottomSheetEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className={`${evt.color} rounded-xl p-5 text-white cursor-pointer transition-transform active:scale-[0.98] shadow-lg`}
                    onClick={() => {
                      setSelectedDate(null);
                      setBottomSheetEvents([]);
                      bottomSheetOpenRef.current = false;
                      onEventDoubleClick(evt);
                    }}
                  >
                    <div className="font-bold text-xl mb-2">{evt.title}</div>
                    <div className="text-base opacity-90 font-medium">
                      {evt.allDay ? (
                        '종일'
                      ) : (
                        <>
                          {fmtTime(evt.startDate)} - {fmtTime(evt.endDate)}
                        </>
                      )}
                    </div>
                    {evt.description && (
                      <div className="text-sm opacity-85 mt-2 leading-relaxed">
                        {evt.description}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Calendar;
