'use client';

import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { buildMonthGrid } from '@/lib/calendar-utils';

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
): Map<
  string,
  { row: number; event: CalendarEvent; startCol: number; span: number }
> => {
  const rows: { event: CalendarEvent; startCol: number; endCol: number }[][] =
    [];
  const eventToRow = new Map<
    string,
    { row: number; event: CalendarEvent; startCol: number; span: number }
  >();

  const weekEnd = addDays(weekStart, 6);

  const multiDayEvents = events
    .filter((evt) => {
      if (!isMultiDayEvent(evt)) return false;
      const s = startOfDay(new Date(evt.startDate));
      const e = startOfDay(new Date(evt.endDate));
      return s <= weekEnd && e >= startOfDay(weekStart);
    })
    .sort((a, b) => {
      const diff = a.startDate.getTime() - b.startDate.getTime();
      if (diff !== 0) return diff;
      return b.endDate.getTime() - a.endDate.getTime();
    });

  for (const event of multiDayEvents) {
    const eventStart = startOfDay(new Date(event.startDate));
    const eventEnd = startOfDay(new Date(event.endDate));

    // 이 주에서의 시작/끝 계산
    const visibleStart =
      eventStart < startOfDay(weekStart) ? startOfDay(weekStart) : eventStart;
    const visibleEnd = eventEnd > weekEnd ? weekEnd : eventEnd;

    const startCol = Math.floor(
      (visibleStart.getTime() - startOfDay(weekStart).getTime()) / MS_DAY
    );
    const endCol = Math.floor(
      (visibleEnd.getTime() - startOfDay(weekStart).getTime()) / MS_DAY
    );
    const span = endCol - startCol + 1;

    // 빈 row 찾기
    let assignedRow = -1;
    for (let i = 0; i < rows.length; i++) {
      const rowEvents = rows[i];
      const hasOverlap = rowEvents.some((existing) => {
        return !(endCol < existing.startCol || startCol > existing.endCol);
      });
      if (!hasOverlap) {
        assignedRow = i;
        break;
      }
    }

    if (assignedRow === -1) {
      assignedRow = rows.length;
      rows.push([]);
    }

    rows[assignedRow].push({ event, startCol, endCol });
    eventToRow.set(`${event.id}-${monthKey(weekStart)}`, {
      row: assignedRow,
      event,
      startCol,
      span,
    });
  }

  return eventToRow;
};

const getMultiDayEventsForDate = (
  events: CalendarEvent[],
  date: Date
): CalendarEvent[] => {
  const cellDate = startOfDay(date);
  return events.filter((evt) => {
    if (!isMultiDayEvent(evt)) return false;
    const s = startOfDay(new Date(evt.startDate));
    const e = startOfDay(new Date(evt.endDate));
    return cellDate >= s && cellDate <= e;
  });
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

  const [showDayModal, setShowDayModal] = useState(false);
  const [dayModalDate, setDayModalDate] = useState<Date | null>(null);
  const [dayModalEvents, setDayModalEvents] = useState<CalendarEvent[]>([]);

  // 드래그(포인터) 상태
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<Date | null>(null);
  const [dragEnd, setDragEnd] = useState<Date | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const dialogJustOpenedRef = useRef(false);

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
        const previousScrollHeight = container.scrollHeight;

        setDisplayMonths((prev) => [...toAdd, ...prev]);

        // DOM 업데이트 후 스크롤 위치 보정
        requestAnimationFrame(() => {
          const newScrollHeight = container.scrollHeight;
          const addedHeight = newScrollHeight - previousScrollHeight;
          container.scrollTop = scrollTop + addedHeight;
          isUpdatingScrollRef.current = false;
        });
      } else {
        isUpdatingScrollRef.current = false;
      }
    }

    // 하단 가까우면 다음 달 추가
    const { scrollHeight, clientHeight } = container;
    if (scrollTop + clientHeight > scrollHeight - 200) {
      const last = displayMonths[displayMonths.length - 1];
      const toAdd: Date[] = [];
      for (let i = 1; i <= LOAD_CHUNK; i++) {
        const m = addMonths(last, i);
        if (!displayMonths.some((d) => monthKey(d) === monthKey(m)))
          toAdd.push(m);
      }
      if (toAdd.length) {
        setDisplayMonths((prev) => [...prev, ...toAdd]);
      }
    }
  };

  /* 5) 드래그(포인터)로 날짜 범위 선택 — 모바일/PC 공통 */
  const isDateInDragRange = (date: Date): boolean => {
    if (!isDragging || !dragStart || !dragEnd) return false;
    const s = dragStart < dragEnd ? dragStart : dragEnd;
    const e = dragStart < dragEnd ? dragEnd : dragStart;
    const d = startOfDay(date);
    return d >= startOfDay(s) && d <= startOfDay(e);
  };

  const handlePointerDown = (date: Date, e: React.PointerEvent) => {
    if (bottomSheetOpenRef.current) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-event-clickable]')) return;
    touchStartPosRef.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
    setDragStart(date);
    setDragEnd(date);
  };

  const handlePointerMove = (date: Date) => {
    if (isDragging) {
      setDragEnd(date);
    }
  };

  const handlePointerUp = (date: Date, e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-event-clickable]')) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    if (touchStartPosRef.current) {
      const dx = Math.abs(e.clientX - touchStartPosRef.current.x);
      const dy = Math.abs(e.clientY - touchStartPosRef.current.y);
      if (dx > 10 || dy > 10) {
        setIsDragging(false);
        setDragStart(null);
        setDragEnd(null);
        touchStartPosRef.current = null;
        return;
      }
    }

    if (isMobile) {
      const cellStart = startOfDay(date);
      const cellEnd = endOfDay(date);

      const multiDayEventsForCell = getMultiDayEventsForDate(events, date);

      const singleDayAllDayEvents = events.filter((evt: CalendarEvent) => {
        if (!evt.allDay || isMultiDayEvent(evt)) return false;
        const s = startOfDay(new Date(evt.startDate));
        return isSameDay(s, date);
      });

      const timedSingles = events.filter((evt: CalendarEvent) => {
        if (evt.allDay) return false;
        const s = new Date(evt.startDate);
        const ev = new Date(evt.endDate);
        return (
          (s >= cellStart && s <= cellEnd) ||
          (ev >= cellStart && ev <= cellEnd) ||
          (s <= cellStart && ev >= cellEnd)
        );
      });

      const allDayEventsForDate = [
        ...multiDayEventsForCell,
        ...singleDayAllDayEvents,
        ...timedSingles,
      ];

      if (allDayEventsForDate.length > 0) {
        setSelectedDate(date);
        setBottomSheetEvents(allDayEventsForDate);
        bottomSheetOpenRef.current = true;
        setIsDragging(false);
        setDragStart(null);
        setDragEnd(null);
        touchStartPosRef.current = null;
        return;
      }
    }

    if (isDragging && dragStart) {
      const s = dragStart < date ? dragStart : date;
      const e = dragStart < date ? date : dragStart;
      dialogJustOpenedRef.current = true;
      setTimeout(() => {
        dialogJustOpenedRef.current = false;
      }, 300);
      onDateRangeSelect(s, e);
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
    touchStartPosRef.current = null;
  };

  const fmtTime = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(
      2,
      '0'
    )}`;

  const MAX_VISIBLE_EVENTS = 3;

  /* 6) 월 렌더 */
  const renderMonth = (date: Date) => {
    const y = date.getFullYear();
    const m = date.getMonth();
    const grid = buildMonthGrid(y, m);

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
              const firstValidDate = week.find((d) => d !== null);
              const weekStart = firstValidDate
                ? startOfDay(addDays(firstValidDate, -firstValidDate.getDay()))
                : new Date();

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
                        startCol: number;
                        span: number;
                        isWeekStart: boolean;
                      }[] = [];

                      eventToRow.forEach(({ row, event, startCol, span }) => {
                        if (startCol === colIdx) {
                          const eventStart = startOfDay(
                            new Date(event.startDate)
                          );
                          const isWeekStart =
                            colIdx === 0 && eventStart < weekStart;
                          multiDayEventsForCell.push({
                            event,
                            row,
                            startCol,
                            span,
                            isWeekStart,
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

                      const multiDayEventsOnThisDate = getMultiDayEventsForDate(
                        events,
                        cellDate
                      );

                      const allDayEventsForDate = [
                        ...multiDayEventsOnThisDate,
                        ...singleDayAllDayEvents,
                        ...timedSingles,
                      ];

                      // 최대 row 수 계산
                      const maxMultiDayRows =
                        Math.max(
                          ...multiDayEventsForCell.map((m) => m.row),
                          -1
                        ) + 1;
                      const visibleMultiDayCount = multiDayEventsForCell.filter(
                        (m) => m.row < MAX_VISIBLE_EVENTS
                      ).length;

                      const multiDayEventsRenderedElsewhere =
                        multiDayEventsOnThisDate.filter((evt) => {
                          const isRenderedInThisCell =
                            multiDayEventsForCell.some(
                              (m) =>
                                m.event.id === evt.id &&
                                m.row < MAX_VISIBLE_EVENTS
                            );
                          if (isRenderedInThisCell) return false;

                          let isVisibleInRow = false;
                          eventToRow.forEach(({ event, row }) => {
                            if (
                              event.id === evt.id &&
                              row < MAX_VISIBLE_EVENTS
                            ) {
                              isVisibleInRow = true;
                            }
                          });
                          return isVisibleInRow;
                        }).length;

                      const totalVisibleMultiDay =
                        visibleMultiDayCount + multiDayEventsRenderedElsewhere;

                      const remainingSpace = Math.max(
                        0,
                        MAX_VISIBLE_EVENTS - totalVisibleMultiDay
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

                      const totalEventsOnDate =
                        multiDayEventsOnThisDate.length +
                        singleDayAllDayEvents.length +
                        timedSingles.length;
                      const totalVisibleOnDate =
                        totalVisibleMultiDay + visibleSingleDay + visibleTimed;
                      const hiddenCount =
                        totalEventsOnDate - totalVisibleOnDate;

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
                          onPointerDown={(e) => handlePointerDown(cellDate, e)}
                          onPointerMove={() => handlePointerMove(cellDate)}
                          onPointerUp={(e) => handlePointerUp(cellDate, e)}
                        >
                          <div className="flex items-start justify-between">
                            <span
                              className={`text-sm font-medium ${
                                colIdx === 0
                                  ? 'text-red-500'
                                  : colIdx === 6
                                  ? 'text-blue-500'
                                  : ''
                              }`}
                            >
                              {cellDate.getDate()}
                            </span>
                            {onCreateNewEvent && (
                              <button
                                data-event-clickable
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCreateNewEvent(cellDate);
                                }}
                                className="opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100 p-0.5 rounded hover:bg-accent transition-opacity"
                              >
                                <Plus className="w-3 h-3 text-muted-foreground" />
                              </button>
                            )}
                          </div>

                          {isMobile && allDayEventsForDate.length > 0 ? (
                            <div className="flex flex-wrap gap-0.5 mt-1">
                              {allDayEventsForDate
                                .slice(0, 6)
                                .map((evt, idx) => (
                                  <div
                                    key={`dot-${evt.id}-${idx}`}
                                    className={`w-1.5 h-1.5 rounded-full ${evt.color}`}
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
                                .filter((m) => m.row < MAX_VISIBLE_EVENTS)
                                .map(
                                  ({ event: evt, row, span, isWeekStart }) => {
                                    const widthPercent = span * 100;
                                    const gapAdjustment = (span - 1) * 4;
                                    const topPosition = 32 + row * 22;

                                    return (
                                      <div
                                        key={`multi-${
                                          evt.id
                                        }-${cellDate.getTime()}`}
                                        data-event-clickable
                                        className={`${
                                          evt.color
                                        } absolute left-2 right-[-4px] ${
                                          isWeekStart
                                            ? 'rounded-l-none'
                                            : 'rounded-l-md'
                                        } rounded-r-md px-1.5 py-0.5 text-[11px] font-semibold text-white shadow-sm transition-transform hover:scale-105 cursor-pointer z-10 flex items-center overflow-hidden whitespace-nowrap`}
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
                                          {isWeekStart
                                            ? `← ${evt.title}`
                                            : evt.title}
                                        </span>
                                      </div>
                                    );
                                  }
                                )}

                              {visibleSingleDay > 0 && (
                                <div
                                  style={{
                                    marginTop: `${
                                      totalVisibleMultiDay * 22 + 4
                                    }px`,
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
                                        : `${totalVisibleMultiDay * 22 + 4}px`,
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
                                  data-event-clickable
                                  className="text-[11px] text-muted-foreground px-1.5 cursor-pointer hover:text-foreground hover:bg-accent/50 rounded transition-colors mt-1"
                                  style={{
                                    marginTop: `${Math.max(
                                      totalVisibleMultiDay * 22 + 4,
                                      36
                                    )}px`,
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDayModalDate(cellDate);
                                    setDayModalEvents(allDayEventsForDate);
                                    setShowDayModal(true);
                                  }}
                                >
                                  +{hiddenCount}개 더보기
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

  // 바텀시트 및 더보기 모달 UI 업데이트
  return (
    <div className="flex flex-col h-full relative">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className="text-xl font-bold">
          {year}년 {month + 1}월
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-sm font-medium mb-1 flex-shrink-0">
        {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
          <div
            key={d}
            className={
              i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : ''
            }
          >
            {d}
          </div>
        ))}
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto space-y-4"
        onScroll={handleScroll}
      >
        {displayMonths.map((monthDate) => (
          <div key={monthKey(monthDate)}>{renderMonth(monthDate)}</div>
        ))}
      </div>

      {/* 바텀시트 */}
      {selectedDate && bottomSheetEvents.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/50"
          onClick={() => {
            setSelectedDate(null);
            setBottomSheetEvents([]);
            bottomSheetOpenRef.current = false;
          }}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl p-4 max-h-[60vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSelectedDate(null);
                  setBottomSheetEvents([]);
                  bottomSheetOpenRef.current = false;
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {bottomSheetEvents.map((evt) => (
                <div
                  key={evt.id}
                  className={`${evt.color} p-3 rounded-lg text-white cursor-pointer`}
                  onClick={() => {
                    onEventDoubleClick(evt);
                    setSelectedDate(null);
                    setBottomSheetEvents([]);
                    bottomSheetOpenRef.current = false;
                  }}
                >
                  <div className="font-semibold">{evt.title}</div>
                  <div className="text-sm opacity-90">
                    {evt.allDay
                      ? isMultiDayEvent(evt)
                        ? `${new Date(
                            evt.startDate
                          ).toLocaleDateString()} ~ ${new Date(
                            evt.endDate
                          ).toLocaleDateString()}`
                        : '종일'
                      : `${fmtTime(evt.startDate)} - ${fmtTime(evt.endDate)}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 더보기 모달 */}
      {showDayModal && dayModalDate && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowDayModal(false)}
        >
          <div
            className="bg-background rounded-2xl p-4 max-w-md w-full max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {dayModalDate.getMonth() + 1}월 {dayModalDate.getDate()}일
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDayModal(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {dayModalEvents.map((evt) => (
                <div
                  key={evt.id}
                  className={`${evt.color} p-3 rounded-lg text-white cursor-pointer`}
                  onClick={() => {
                    onEventDoubleClick(evt);
                    setShowDayModal(false);
                  }}
                >
                  <div className="font-semibold">{evt.title}</div>
                  <div className="text-sm opacity-90">
                    {evt.allDay
                      ? isMultiDayEvent(evt)
                        ? `${new Date(
                            evt.startDate
                          ).toLocaleDateString()} ~ ${new Date(
                            evt.endDate
                          ).toLocaleDateString()}`
                        : '종일'
                      : `${fmtTime(evt.startDate)} - ${fmtTime(evt.endDate)}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Calendar;
