'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { fetchAllCalendarEvents } from '@/lib/api';

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

/** 종일은 end(익일 00:00, exclusive) → 비교/표시용으로 -1ms 보정 */
const adjustedEnd = (evt: CalendarEvent) => {
  const e = new Date(evt.endDate);
  return evt.allDay ? new Date(e.getTime() - 1) : e;
};

/** 서버 원본 → 캘린더 이벤트로 매핑 */
function mapRawToCalendarEvent(raw: any, idx: number): CalendarEvent {
  const startMs =
    typeof raw.startTimestamp === 'number'
      ? raw.startTimestamp
      : raw.start
      ? Date.parse(raw.start)
      : NaN;
  const endMs =
    typeof raw.endTimestamp === 'number'
      ? raw.endTimestamp
      : raw.end
      ? Date.parse(raw.end)
      : NaN;

  const palette = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-green-500',
    'bg-orange-500',
    'bg-pink-500',
  ];

  return {
    id: raw.id,
    title: raw.title ?? 'Untitled',
    description: raw.description ?? '',
    startDate: new Date(startMs),
    endDate: new Date(endMs),
    allDay: !!raw.allDay,
    color: palette[idx % palette.length],
  };
}

/** 한 달 캘린더 셀(week x 7) 생성 */
function buildMonthGrid(y: number, m: number): (Date | null)[][] {
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const daysCount = last.getDate();
  const startDay = first.getDay(); // Sun(0)~Sat(6)

  const totalCells = startDay + daysCount;
  const totalRows = Math.ceil(totalCells / 7);

  const calendarGrid: (Date | null)[][] = [];
  let dayCounter = 1;
  for (let row = 0; row < totalRows; row++) {
    calendarGrid[row] = [];
    for (let col = 0; col < 7; col++) {
      if (row === 0 && col < startDay) {
        calendarGrid[row][col] = null;
      } else if (dayCounter <= daysCount) {
        calendarGrid[row][col] = new Date(y, m, dayCounter);
        dayCounter++;
      } else {
        calendarGrid[row][col] = null;
      }
    }
  }
  return calendarGrid;
}

/* ===== Props ===== */
type Props = {
  onEventDoubleClick: (event: CalendarEvent) => void;
  onDateRangeSelect: (start: Date, end: Date) => void;
};

/* ===== 컴포넌트 ===== */
export function Calendar({ onEventDoubleClick, onDateRangeSelect }: Props) {
  // 상태
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date()); // 가운데(기준) 달
  const [displayMonths, setDisplayMonths] = useState<Date[]>([]);

  // 드래그(포인터) 상태
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<Date | null>(null);
  const [dragEnd, setDragEnd] = useState<Date | null>(null);

  // 성능 파라미터
  const INITIAL_BEFORE = 2; // 현재 달 기준 앞쪽 렌더 개월
  const INITIAL_AFTER = 2; // 현재 달 기준 뒤쪽 렌더 개월
  const LOAD_CHUNK = 1; // 스크롤 시 한 번에 추가할 개월
  const MAX_WINDOW = 9; // 화면에 유지할 최대 개월 수

  // refs
  const containerRef = useRef<HTMLDivElement>(null);
  const monthRefs = useRef<Map<string, HTMLDivElement>>(new Map()); // 각 달 Card ref
  const isMobile = useIsMobile();

  /* 1) 모든 이벤트 1회 로드 + 초기 월 윈도우 만들기 (전체 기간 조회) */
  useEffect(() => {
    (async () => {
      const raw = await fetchAllCalendarEvents(); // ❗️쿼리 없이 전체 기간
      const mapped: CalendarEvent[] = raw
        .map((r: any, i: number) => mapRawToCalendarEvent(r, i))
        .filter(
          (ev: CalendarEvent) =>
            !Number.isNaN(ev.startDate.getTime()) &&
            !Number.isNaN(ev.endDate.getTime())
        )
        .sort(
          (a: CalendarEvent, b: CalendarEvent) =>
            a.startDate.getTime() - b.startDate.getTime()
        );

      setEvents(mapped);

      // 오늘 기준 ±N개월 렌더
      const now = new Date();
      const months: Date[] = [];
      for (let i = -INITIAL_BEFORE; i <= INITIAL_AFTER; i++) {
        months.push(new Date(now.getFullYear(), now.getMonth() + i, 1));
      }
      setDisplayMonths(months);
      setCurrentDate(now);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 2) 현재 달 카드로 스크롤(초기 위치를 가운데로) → 위/아래 확장 가능 */
  useEffect(() => {
    if (displayMonths.length === 0) return;
    const key = monthKey(currentDate);
    const el = monthRefs.current.get(key);
    if (el && containerRef.current) {
      el.scrollIntoView({ block: 'start', behavior: 'auto' });
      containerRef.current.scrollTop += 16; // top trigger 여유
    }
  }, [displayMonths, currentDate]);

  /* 3) prev/next 버튼 */
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  /* 4) 스크롤로 월 동적 추가 + 윈도우 트림 */
  const trimWindowIfNeeded = (dir: 'prepend' | 'append') => {
    if (displayMonths.length <= MAX_WINDOW) return;

    const overflow = displayMonths.length - MAX_WINDOW;
    if (overflow <= 0) return;

    if (dir === 'prepend') {
      // 앞에 추가했으면 뒤에서 잘라내기
      setDisplayMonths((prev) => prev.slice(0, prev.length - overflow));
    } else {
      // 뒤에 추가했으면 앞에서 잘라내기 + 스크롤 위치 보정
      const c = containerRef.current;
      setDisplayMonths((prev) => prev.slice(overflow));
      if (c) c.scrollTop = c.scrollTop - 480 * overflow; // 대략 카드 한 장 높이 보정
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;

    if (displayMonths.length === 0) return;

    // 상단 가까우면 이전 달 추가
    if (scrollTop < 120) {
      const first = displayMonths[0];
      const toAdd: Date[] = [];
      for (let i = LOAD_CHUNK; i >= 1; i--) {
        const m = addMonths(first, -i);
        if (!displayMonths.some((d) => monthKey(d) === monthKey(m)))
          toAdd.push(m);
      }
      if (toAdd.length > 0) {
        setDisplayMonths((prev) => [...toAdd, ...prev]);
        // 스크롤 점프 최소화
        requestAnimationFrame(() => {
          container.scrollTop = scrollTop + 480 * toAdd.length;
        });
        trimWindowIfNeeded('prepend');
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
        setDisplayMonths((prev) => [...prev, ...toAdd]);
        trimWindowIfNeeded('append');
      }
    }
  };

  /* 5) 드래그(포인터)로 날짜 범위 선택 — 모바일/PC 공통 */
  useEffect(() => {
    const onPointerUp = () => {
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
              // 이번 주의 시작/끝(끝은 exclusive처럼 취급)
              const weekStart =
                week.find((d) => d !== null) ?? new Date(y, m, 1);
              const weekStartDay = startOfDay(weekStart as Date);
              const weekEnd = addDays(weekStartDay, 7);

              // 상단 멀티데이 바(주 단위로 잘라 표시)
              const multiRow = events
                .filter((evt: CalendarEvent) => {
                  const s = startOfDay(new Date(evt.startDate));
                  const e = adjustedEnd(evt);
                  return s < weekEnd && e >= weekStartDay;
                })
                .map((evt: CalendarEvent) => {
                  const s = startOfDay(new Date(evt.startDate));
                  const e = adjustedEnd(evt);
                  const sIn = s < weekStartDay ? weekStartDay : s;
                  const eIn =
                    e >= addDays(weekEnd, -1) ? addDays(weekEnd, -1) : e;

                  const startCol =
                    Math.floor(
                      (startOfDay(sIn).getTime() - weekStartDay.getTime()) /
                        MS_DAY
                    ) + 1;
                  const spanCols =
                    Math.floor(
                      (endOfDay(eIn).getTime() - startOfDay(sIn).getTime()) /
                        MS_DAY
                    ) + 1;

                  const isFirstWeek = s >= weekStartDay && s < weekEnd;
                  return { evt, startCol, spanCols, isFirstWeek };
                })
                .sort(
                  (a: { spanCols: number }, b: { spanCols: number }) =>
                    b.spanCols - a.spanCols
                );

              return (
                <div key={`week-${weekIdx}`} className="relative">
                  {/* 멀티데이 바 */}
                  <div className="grid grid-cols-7 gap-1 mb-1 min-h-[28px]">
                    {multiRow.map(
                      (
                        item: {
                          evt: CalendarEvent;
                          startCol: number;
                          spanCols: number;
                          isFirstWeek: boolean;
                        },
                        idx: number
                      ) => (
                        <div
                          key={`span-${item.evt.id}-${weekIdx}-${idx}`}
                          className={`${item.evt.color} rounded-full px-3 py-1 text-xs font-medium text-white shadow-sm transition-transform hover:scale-105 flex items-center overflow-hidden whitespace-nowrap cursor-pointer`}
                          style={{
                            gridColumn: `${item.startCol} / span ${item.spanCols}`,
                          }}
                          onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                            e.stopPropagation();
                            onEventDoubleClick(item.evt);
                          }}
                          title={`${item.evt.title}\n${new Date(
                            item.evt.startDate
                          ).toLocaleString()} ~ ${adjustedEnd(
                            item.evt
                          ).toLocaleString()}`}
                        >
                          {item.isFirstWeek && (
                            <span className="truncate">{item.evt.title}</span>
                          )}
                        </div>
                      )
                    )}
                  </div>

                  {/* 날짜 셀 */}
                  <div className="grid grid-cols-7 gap-1">
                    {week.map((cellDate, colIdx) => {
                      if (!cellDate) return <div key={`empty-${colIdx}`} />;

                      const now = new Date();
                      const today = isSameDay(cellDate, now);
                      const inDrag = isDateInDragRange(cellDate);

                      // 단일일정(시작/종료 같은 날)
                      const singleDayEvents = events.filter(
                        (evt: CalendarEvent) => {
                          const s = startOfDay(new Date(evt.startDate));
                          const e = adjustedEnd(evt);
                          return (
                            isSameDay(s, cellDate) && isSameDay(e, cellDate)
                          );
                        }
                      );

                      return (
                        <div
                          key={cellDate.getTime()}
                          className={`relative aspect-square cursor-pointer rounded-lg p-2 transition-all duration-200 ${
                            inDrag
                              ? 'bg-primary/20 shadow-sm'
                              : 'bg-card/50 hover:bg-accent/50 hover:shadow-md'
                          } ${
                            today
                              ? 'ring-2 ring-primary ring-offset-1 bg-primary/5'
                              : ''
                          }`}
                          // ✅ Pointer Events: 모바일/PC 공통 드래그
                          onPointerDown={(
                            e: React.PointerEvent<HTMLDivElement>
                          ) => {
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
                            const el = e.currentTarget as HTMLElement;
                            endDrag(el, e.pointerId);
                          }}
                        >
                          <div
                            className={`text-sm font-semibold ${
                              today ? 'text-primary' : 'text-foreground'
                            }`}
                          >
                            {cellDate.getDate()}
                          </div>
                          <div className="mt-1 space-y-0.5">
                            {singleDayEvents.map((evt: CalendarEvent) => (
                              <div
                                key={evt.id}
                                className={`${evt.color} cursor-pointer truncate rounded-md px-1.5 py-0.5 text-xs font-medium text-white shadow-sm transition-transform hover:scale-105`}
                                onClick={(
                                  e: React.MouseEvent<HTMLDivElement>
                                ) => {
                                  e.stopPropagation();
                                  onEventDoubleClick(evt);
                                }}
                                title={evt.title}
                              >
                                {evt.title}
                              </div>
                            ))}
                          </div>
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

  /* 컨테이너: 렌더 윈도우 + 스크롤 확장 */
  return (
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
  );
}

export default Calendar;
