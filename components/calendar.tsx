'use client';

import type React from 'react';
import {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from 'react';
import { ChevronLeft, ChevronRight, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

const filterDuplicateMonths = (
  existingMonths: Date[],
  newMonths: Date[]
): Date[] => {
  const existingKeys = new Set(existingMonths.map(monthKey));
  return newMonths.filter((m) => !existingKeys.has(monthKey(m)));
};

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

/* ===== EventChip 컴포넌트 ===== */
// Tailwind 색상 클래스(bg-xxx)를 노션 스타일(연한 배경 + 진한 텍스트)로 변환
const COLOR_MAP: Record<string, { bg: string; text: string; border: string; darkBg: string; darkText: string; darkBorder: string }> = {
  'bg-blue-500':    { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd', darkBg: '#1e3a5f', darkText: '#93c5fd', darkBorder: '#2563eb' },
  'bg-green-500':   { bg: '#dcfce7', text: '#166534', border: '#86efac', darkBg: '#14532d', darkText: '#86efac', darkBorder: '#16a34a' },
  'bg-red-500':     { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5', darkBg: '#450a0a', darkText: '#fca5a5', darkBorder: '#dc2626' },
  'bg-yellow-500':  { bg: '#fef9c3', text: '#854d0e', border: '#fde047', darkBg: '#422006', darkText: '#fde047', darkBorder: '#ca8a04' },
  'bg-purple-500':  { bg: '#f3e8ff', text: '#6b21a8', border: '#d8b4fe', darkBg: '#3b0764', darkText: '#d8b4fe', darkBorder: '#9333ea' },
  'bg-pink-500':    { bg: '#fce7f3', text: '#9d174d', border: '#f9a8d4', darkBg: '#500724', darkText: '#f9a8d4', darkBorder: '#ec4899' },
  'bg-orange-500':  { bg: '#ffedd5', text: '#9a3412', border: '#fdba74', darkBg: '#431407', darkText: '#fdba74', darkBorder: '#f97316' },
  'bg-teal-500':    { bg: '#ccfbf1', text: '#134e4a', border: '#5eead4', darkBg: '#042f2e', darkText: '#5eead4', darkBorder: '#14b8a6' },
  'bg-indigo-500':  { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc', darkBg: '#1e1b4b', darkText: '#a5b4fc', darkBorder: '#6366f1' },
  'bg-cyan-500':    { bg: '#cffafe', text: '#164e63', border: '#67e8f9', darkBg: '#083344', darkText: '#67e8f9', darkBorder: '#06b6d4' },
  'bg-rose-500':    { bg: '#ffe4e6', text: '#9f1239', border: '#fda4af', darkBg: '#4c0519', darkText: '#fda4af', darkBorder: '#f43f5e' },
  'bg-violet-500':  { bg: '#ede9fe', text: '#5b21b6', border: '#c4b5fd', darkBg: '#2e1065', darkText: '#c4b5fd', darkBorder: '#8b5cf6' },
  'bg-lime-500':    { bg: '#ecfccb', text: '#365314', border: '#bef264', darkBg: '#1a2e05', darkText: '#bef264', darkBorder: '#84cc16' },
  'bg-amber-500':   { bg: '#fef3c7', text: '#92400e', border: '#fcd34d', darkBg: '#451a03', darkText: '#fcd34d', darkBorder: '#f59e0b' },
  'bg-sky-500':     { bg: '#e0f2fe', text: '#0c4a6e', border: '#7dd3fc', darkBg: '#082f49', darkText: '#7dd3fc', darkBorder: '#0ea5e9' },
  'bg-emerald-500': { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7', darkBg: '#022c22', darkText: '#6ee7b7', darkBorder: '#10b981' },
  'bg-fuchsia-500': { bg: '#fae8ff', text: '#86198f', border: '#f0abfc', darkBg: '#4a044e', darkText: '#f0abfc', darkBorder: '#d946ef' },
  'bg-slate-500':   { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1', darkBg: '#1e293b', darkText: '#94a3b8', darkBorder: '#475569' },
  'bg-gray-500':    { bg: '#f9fafb', text: '#374151', border: '#d1d5db', darkBg: '#1f2937', darkText: '#9ca3af', darkBorder: '#6b7280' },
};

function getChipStyle(colorClass: string) {
  const entry = COLOR_MAP[colorClass];
  if (entry) return entry;
  return COLOR_MAP['bg-slate-500'];
}

type EventChipProps = {
  color: string;
  title: string;
  isMultiDay: boolean;
  showArrow?: boolean;
};

function EventChip({ color, title, isMultiDay, showArrow }: EventChipProps) {
  const style = getChipStyle(color);
  return (
    <div
      className="w-full h-full flex items-center overflow-hidden whitespace-nowrap px-1.5 text-[11px] font-medium rounded-[3px] transition-opacity hover:opacity-90
        [.dark_&]:!bg-[var(--chip-dark-bg)] [.dark_&]:!text-[var(--chip-dark-text)] [.dark_&]:![border-left-color:var(--chip-dark-border)]"
      style={{
        backgroundColor: style.bg,
        color: style.text,
        borderLeft: isMultiDay ? `3px solid ${style.border}` : `2px solid ${style.border}`,
        lineHeight: '20px',
        '--chip-dark-bg': style.darkBg,
        '--chip-dark-text': style.darkText,
        '--chip-dark-border': style.darkBorder,
      } as React.CSSProperties}
    >
      <span className="truncate">
        {showArrow ? `← ${title}` : title}
      </span>
    </div>
  );
}

/* ===== Props ===== */
type Props = {
  events: CalendarEvent[];
  onEventDoubleClick: (event: CalendarEvent) => void;
  onDateRangeSelect: (start: Date, end: Date) => void;
  onCreateNewEvent?: (date: Date) => void;
  onMonthChange?: (months: Date[]) => void;
};

/* ===== 컴포넌트 ===== */
export function Calendar({
  events,
  onEventDoubleClick,
  onDateRangeSelect,
  onCreateNewEvent,
  onMonthChange,
}: Props) {
  // 상태
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
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

  const dragStateRef = useRef<{
    isDragging: boolean;
    dragStart: Date | null;
    dragEnd: Date | null;
  }>({
    isDragging: false,
    dragStart: null,
    dragEnd: null,
  });

  const [dragRange, setDragRange] = useState<{ start: Date; end: Date } | null>(
    null
  );
  const dragUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const dialogJustOpenedRef = useRef(false);

  // 성능 파라미터
  const INITIAL_BEFORE = 2;
  const INITIAL_AFTER = 2;
  const LOAD_CHUNK = 1;

  // refs
  const containerRef = useRef<HTMLDivElement>(null);
  const monthRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const isUpdatingScrollRef = useRef(false);
  const isMobile = useIsMobile();

  const eventsByMonth = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();

    events.forEach((evt) => {
      const startDate = new Date(evt.startDate);
      const endDate = new Date(evt.endDate);

      // 이벤트가 걸치는 모든 월에 추가
      const current = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        1
      );
      const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

      while (current <= endMonth) {
        const key = monthKey(current);
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key)!.push(evt);
        current.setMonth(current.getMonth() + 1);
      }
    });

    return map;
  }, [events]);

  const getEventsForMonth = useCallback(
    (monthDate: Date): CalendarEvent[] => {
      const key = monthKey(monthDate);
      return eventsByMonth.get(key) || [];
    },
    [eventsByMonth]
  );

  /* 1) 초기 월 윈도우 만들기 */
  useEffect(() => {
    const now = new Date();
    const months: Date[] = [];
    for (let i = -INITIAL_BEFORE; i <= INITIAL_AFTER; i++) {
      months.push(new Date(now.getFullYear(), now.getMonth() + i, 1));
    }
    setDisplayMonths(months);
    setCurrentDate(now);

    onMonthChange?.(months);
  }, []);

  /* 2) 현재 달 카드로 스크롤 */
  useEffect(() => {
    if (!isInitialLoad || displayMonths.length === 0) return;

    const key = monthKey(currentDate);
    const el = monthRefs.current.get(key);
    if (el && containerRef.current) {
      el.scrollIntoView({ block: 'start', behavior: 'auto' });
      containerRef.current.scrollTop += 16;
      setIsInitialLoad(false);
    }
  }, [displayMonths, currentDate, isInitialLoad]);

  /* 3) prev/next 버튼 */
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // displayMonths를 ref로도 추적 (handleScroll 클로저 의존 제거)
  const displayMonthsRef = useRef<Date[]>([]);
  useEffect(() => {
    displayMonthsRef.current = displayMonths;
  }, [displayMonths]);

  const onMonthChangeRef = useRef(onMonthChange);
  useEffect(() => {
    onMonthChangeRef.current = onMonthChange;
  }, [onMonthChange]);

  /* 4) 스크롤로 월 동적 추가 - ref 기반으로 클로저 의존 제거 */
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (isUpdatingScrollRef.current) return;

      const container = e.currentTarget;
      const scrollTop = container.scrollTop;
      const months = displayMonthsRef.current;

      if (months.length === 0) return;

      // 상단 가까우면 이전 달 추가
      if (scrollTop < 120) {
        isUpdatingScrollRef.current = true;

        const first = months[0];
        const toAdd: Date[] = [];
        for (let i = LOAD_CHUNK; i >= 1; i--) {
          toAdd.push(addMonths(first, -i));
        }

        const previousScrollHeight = container.scrollHeight;

        setDisplayMonths((prev) => {
          const filtered = filterDuplicateMonths(prev, toAdd);
          if (filtered.length === 0) return prev;
          const newMonths = [...filtered, ...prev];
          onMonthChangeRef.current?.(newMonths);
          return newMonths;
        });

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const newScrollHeight = container.scrollHeight;
            const addedHeight = newScrollHeight - previousScrollHeight;
            container.scrollTop = scrollTop + addedHeight;
            isUpdatingScrollRef.current = false;
          });
        });
      }

      // 하단 가까우면 다음 달 추가
      const { scrollHeight, clientHeight } = container;
      if (scrollTop + clientHeight > scrollHeight - 200) {
        const last = months[months.length - 1];
        const toAdd: Date[] = [];
        for (let i = 1; i <= LOAD_CHUNK; i++) {
          toAdd.push(addMonths(last, i));
        }
        setDisplayMonths((prev) => {
          const filtered = filterDuplicateMonths(prev, toAdd);
          if (filtered.length === 0) return prev;
          const newMonths = [...prev, ...filtered];
          onMonthChangeRef.current?.(newMonths);
          return newMonths;
        });
      }
    },
    [] // 의존성 없음 - 모두 ref로 접근
  );

  /* 5) 드래그 범위 체크 */
  const isDateInDragRange = useCallback(
    (date: Date): boolean => {
      if (!dragRange) return false;
      const s =
        dragRange.start < dragRange.end ? dragRange.start : dragRange.end;
      const e =
        dragRange.start < dragRange.end ? dragRange.end : dragRange.start;
      const d = startOfDay(date);
      return d >= startOfDay(s) && d <= startOfDay(e);
    },
    [dragRange]
  );

  const updateDragRange = useCallback(
    (start: Date | null, end: Date | null) => {
      if (dragUpdateTimeoutRef.current) {
        clearTimeout(dragUpdateTimeoutRef.current);
      }

      if (start && end) {
        // 즉시 업데이트 (throttle 없이)
        setDragRange({ start, end });
      } else {
        setDragRange(null);
      }
    },
    []
  );

  const handlePointerDown = useCallback(
    (date: Date, e: React.PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-event-clickable]')) return;

      touchStartPosRef.current = { x: e.clientX, y: e.clientY };

      if (isMobile) {
        return;
      }

      // PC: 패널 열려있으면 드래그 시작 막기
      if (bottomSheetOpenRef.current) return;

      // PC: 드래그 시작
      dragStateRef.current = {
        isDragging: true,
        dragStart: date,
        dragEnd: date,
      };
      updateDragRange(date, date);
    },
    [isMobile, updateDragRange]
  );

  const handlePointerMove = useCallback(
    (date: Date) => {
      if (isMobile) return;
      if (dragStateRef.current.isDragging) {
        dragStateRef.current.dragEnd = date;
        updateDragRange(dragStateRef.current.dragStart, date);
      }
    },
    [isMobile, updateDragRange]
  );

  const handlePointerUp = useCallback(
    (date: Date, e: React.PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-event-clickable]')) {
        dragStateRef.current = {
          isDragging: false,
          dragStart: null,
          dragEnd: null,
        };
        updateDragRange(null, null);
        touchStartPosRef.current = null;
        return;
      }

      if (isMobile) {
        if (touchStartPosRef.current) {
          const dx = Math.abs(e.clientX - touchStartPosRef.current.x);
          const dy = Math.abs(e.clientY - touchStartPosRef.current.y);
          if (dx > 10 || dy > 10) {
            touchStartPosRef.current = null;
            return;
          }
        }
        touchStartPosRef.current = null;

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

        // 같은 날짜를 다시 탭하면 패널 닫기
        if (selectedDate && isSameDay(selectedDate, date)) {
          setSelectedDate(null);
          setBottomSheetEvents([]);
          bottomSheetOpenRef.current = false;
          return;
        }

        if (allDayEventsForDate.length > 0) {
          // 일정 있는 날 → 이벤트 패널 열기
          setSelectedDate(date);
          setBottomSheetEvents(allDayEventsForDate);
          bottomSheetOpenRef.current = true;
        } else {
          // 일정 없는 날 → 새 일정 생성 (기존 패널 닫고 생성 콜백 호출)
          setSelectedDate(null);
          setBottomSheetEvents([]);
          bottomSheetOpenRef.current = false;
          onCreateNewEvent?.(date);
        }
        return;
      }

      if (touchStartPosRef.current) {
        const dx = Math.abs(e.clientX - touchStartPosRef.current.x);
        const dy = Math.abs(e.clientY - touchStartPosRef.current.y);
        if (dx > 10 || dy > 10) {
          if (
            dragStateRef.current.isDragging &&
            dragStateRef.current.dragStart
          ) {
            const s =
              dragStateRef.current.dragStart < date
                ? dragStateRef.current.dragStart
                : date;
            const ev =
              dragStateRef.current.dragStart < date
                ? date
                : dragStateRef.current.dragStart;
            dialogJustOpenedRef.current = true;
            setTimeout(() => {
              dialogJustOpenedRef.current = false;
            }, 300);
            onDateRangeSelect(s, ev);
          }
          dragStateRef.current = {
            isDragging: false,
            dragStart: null,
            dragEnd: null,
          };
          updateDragRange(null, null);
          touchStartPosRef.current = null;
          return;
        }
      }

      if (dragStateRef.current.isDragging && dragStateRef.current.dragStart) {
        const s =
          dragStateRef.current.dragStart < date
            ? dragStateRef.current.dragStart
            : date;
        const ev =
          dragStateRef.current.dragStart < date
            ? date
            : dragStateRef.current.dragStart;
        dialogJustOpenedRef.current = true;
        setTimeout(() => {
          dialogJustOpenedRef.current = false;
        }, 300);
        onDateRangeSelect(s, ev);
      }

      dragStateRef.current = {
        isDragging: false,
        dragStart: null,
        dragEnd: null,
      };
      updateDragRange(null, null);
      touchStartPosRef.current = null;
    },
    [events, isMobile, onDateRangeSelect, updateDragRange, selectedDate]
  );

  const fmtTime = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(
      2,
      '0'
    )}`;

  const MAX_VISIBLE_EVENTS = 3;
  // 노션 스타일 슬롯 상수
  const DATE_HEADER_H = 32;   // 날짜 숫자 영역 높이 (px)
  const SLOT_H = 20;           // 이벤트 바 하나 높이
  const SLOT_GAP = 2;          // 바 사이 간격
  const CELL_MIN_H = 140;      // 셀 최소 높이

  // row → top 픽셀 (날짜 헤더 아래부터 시작)
  const rowTop = (row: number) => DATE_HEADER_H + row * (SLOT_H + SLOT_GAP);

  /* 6) 월 렌더 - useMemo로 최적화 */
  const renderMonth = useCallback(
    (date: Date) => {
      const y = date.getFullYear();
      const m = date.getMonth();
      const grid = buildMonthGrid(y, m);

      const monthEvents = getEventsForMonth(date);

      return (
        <div
          key={monthKey(date)}
          ref={(el) => {
            if (el) monthRefs.current.set(monthKey(date), el);
            else monthRefs.current.delete(monthKey(date));
          }}
          className="select-none mb-8"
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between px-1 py-3">
            {date.getMonth() === month && date.getFullYear() === year ? (
              <>
                {!isMobile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={prevMonth}
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    aria-label="prev"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                <h2 className="text-base font-semibold text-foreground flex-1 text-center">
                  {y}년 {m + 1}월
                </h2>
                {!isMobile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={nextMonth}
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    aria-label="next"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </>
            ) : (
              <h2 className="text-base font-semibold text-muted-foreground flex-1 text-center">
                {y}년 {m + 1}월
              </h2>
            )}
          </div>

          <div>
            {/* 요일 라벨 */}
            <div className="mb-0 grid grid-cols-7 text-center border-b border-border/40">
              {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                <div
                  key={day}
                  className={`text-xs font-medium py-2 ${
                    idx === 0
                      ? 'text-red-400'
                      : idx === 6
                      ? 'text-blue-400'
                      : 'text-muted-foreground'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 주 단위 렌더 */}
            <div className="border-l border-border/40">
              {grid.map((week, weekIdx) => {
                const firstValidDate = week.find((d) => d !== null);
                const weekStart = firstValidDate
                  ? startOfDay(addDays(firstValidDate, -firstValidDate.getDay()))
                  : new Date();

                // 멀티데이 이벤트 행 배정
                const multiDayEventToRow = assignRowsToMultiDayEvents(monthEvents, weekStart);

                // ── 통합 슬롯 배정 ──────────────────────────────────────
                // 각 날짜(col 0~6)의 슬롯 점유 현황을 추적
                // slot[col][row] = true면 사용 중
                const slotOccupied: boolean[][] = Array.from({ length: 7 }, () =>
                  Array(MAX_VISIBLE_EVENTS + 10).fill(false)
                );

                // 멀티데이 먼저 슬롯 점유
                const multiDayBars: {
                  evt: CalendarEvent;
                  row: number;
                  startCol: number;
                  span: number;
                  isWeekStart: boolean;
                }[] = [];
                multiDayEventToRow.forEach(({ row, event: evt, startCol, span }) => {
                  if (row >= MAX_VISIBLE_EVENTS) return;
                  for (let c = startCol; c < startCol + span && c < 7; c++) {
                    slotOccupied[c][row] = true;
                  }
                  const isWeekStart =
                    startCol === 0 &&
                    startOfDay(new Date(evt.startDate)) < weekStart;
                  multiDayBars.push({ evt, row, startCol, span, isWeekStart });
                });

                // 각 날짜별 싱글 이벤트 수집 (슬롯 빈 자리에 배정)
                type SingleEvtEntry = {
                  evt: CalendarEvent;
                  col: number;
                  row: number;
                  isAllDay: boolean;
                };
                const singleEntries: SingleEvtEntry[] = [];

                week.forEach((cellDate, colIdx) => {
                  if (!cellDate) return;
                  const cellStart = startOfDay(cellDate);
                  const cellEnd = endOfDay(cellDate);

                  // 싱글 종일 이벤트
                  const singleAllDay = monthEvents.filter((evt) => {
                    if (!evt.allDay || isMultiDayEvent(evt)) return false;
                    return isSameDay(startOfDay(new Date(evt.startDate)), cellDate);
                  });
                  // 시간 이벤트
                  const timedEvts = monthEvents
                    .filter((evt) => {
                      if (evt.allDay) return false;
                      const s = new Date(evt.startDate);
                      const e = new Date(evt.endDate);
                      return (
                        (s >= cellStart && s <= cellEnd) ||
                        (e >= cellStart && e <= cellEnd) ||
                        (s <= cellStart && e >= cellEnd)
                      );
                    })
                    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

                  [...singleAllDay, ...timedEvts].forEach((evt) => {
                    // 이 col에서 비어있는 첫 번째 row 찾기
                    let assignedRow = -1;
                    for (let r = 0; r < MAX_VISIBLE_EVENTS; r++) {
                      if (!slotOccupied[colIdx][r]) {
                        assignedRow = r;
                        slotOccupied[colIdx][r] = true;
                        break;
                      }
                    }
                    if (assignedRow === -1) return; // MAX 초과 → 숨김
                    singleEntries.push({
                      evt,
                      col: colIdx,
                      row: assignedRow,
                      isAllDay: !!evt.allDay,
                    });
                  });
                });

                // 각 날짜별 hidden count 계산
                const hiddenByCol: number[] = Array(7).fill(0);
                week.forEach((cellDate, colIdx) => {
                  if (!cellDate) return;
                  const cellStart = startOfDay(cellDate);
                  const cellEnd = endOfDay(cellDate);

                  const multiOnDate = monthEvents.filter((evt) => {
                    if (!isMultiDayEvent(evt)) return false;
                    const s = startOfDay(new Date(evt.startDate));
                    const e = startOfDay(new Date(evt.endDate));
                    return cellStart >= s && cellStart <= e;
                  });
                  const singleAllDayOnDate = monthEvents.filter((evt) => {
                    if (!evt.allDay || isMultiDayEvent(evt)) return false;
                    return isSameDay(startOfDay(new Date(evt.startDate)), cellDate);
                  });
                  const timedOnDate = monthEvents.filter((evt) => {
                    if (evt.allDay) return false;
                    const s = new Date(evt.startDate);
                    const e = new Date(evt.endDate);
                    return (
                      (s >= cellStart && s <= cellEnd) ||
                      (e >= cellStart && e <= cellEnd) ||
                      (s <= cellStart && e >= cellEnd)
                    );
                  });
                  const total = multiOnDate.length + singleAllDayOnDate.length + timedOnDate.length;
                  const visible = slotOccupied[colIdx].filter(Boolean).length;
                  hiddenByCol[colIdx] = Math.max(0, total - visible);
                });
                // ────────────────────────────────────────────────────────

                return (
                  <div key={`week-${weekIdx}`} className="relative overflow-visible">
                    {/* ── 멀티데이 바 (week row 기준 absolute) ── */}
                    {multiDayBars.map(({ evt, row, startCol, span, isWeekStart }) => (
                      <div
                        key={`bar-${evt.id}-${weekIdx}`}
                        data-event-clickable
                        className={`absolute z-10 cursor-pointer flex items-center overflow-hidden whitespace-nowrap
                          ${isWeekStart ? 'rounded-l-none' : 'rounded-l-[3px]'}
                          ${startCol + span >= 7 ? 'rounded-r-none' : 'rounded-r-[3px]'}
                        `}
                        style={{
                          left: `calc(${(startCol / 7) * 100}% + ${isWeekStart ? 0 : 2}px)`,
                          width: `calc(${(span / 7) * 100}% - ${isWeekStart ? 2 : (startCol + span >= 7 ? 2 : 4)}px)`,
                          top: `${rowTop(row)}px`,
                          height: `${SLOT_H}px`,
                          backgroundColor: `var(--evt-${evt.color.replace(/^bg-/, '').replace(/-\d+$/, '')}, rgba(0,0,0,0.08))`,
                        }}
                        onClick={(e) => { e.stopPropagation(); onEventDoubleClick(evt); }}
                        title={evt.title}
                      >
                        <EventChip color={evt.color} title={evt.title} isMultiDay showArrow={isWeekStart} />
                      </div>
                    ))}

                    {/* ── 싱글 이벤트 (셀 col 기준 absolute) ── */}
                    {singleEntries.map(({ evt, col, row, isAllDay }) => (
                      <div
                        key={`single-${evt.id}-${col}`}
                        data-event-clickable
                        className="absolute z-10 cursor-pointer rounded-[3px] overflow-hidden"
                        style={{
                          left: `calc(${(col / 7) * 100}% + 2px)`,
                          width: `calc(${(1 / 7) * 100}% - 4px)`,
                          top: `${rowTop(row)}px`,
                          height: `${SLOT_H}px`,
                        }}
                        onClick={(e) => { e.stopPropagation(); onEventDoubleClick(evt); }}
                        title={evt.title}
                      >
                        <EventChip
                          color={evt.color}
                          title={isAllDay ? evt.title : `${fmtTime(evt.startDate)} ${evt.title}`}
                          isMultiDay={false}
                        />
                      </div>
                    ))}

                    {/* ── 날짜 셀 (클릭/드래그 영역) ── */}
                    <div className="grid grid-cols-7 border-t border-border/30">
                      {week.map((cellDate, colIdx) => {
                        if (!cellDate)
                          return (
                            <div
                              key={`empty-${colIdx}`}
                              style={{ minHeight: CELL_MIN_H }}
                              className="border-b border-r border-border/30 bg-muted/10"
                            />
                          );

                        const today = isSameDay(cellDate, new Date());
                        const inDrag = isDateInDragRange(cellDate);
                        const hidden = hiddenByCol[colIdx];

                        // 이 셀의 모든 이벤트 (더보기 모달용)
                        const cellStart = startOfDay(cellDate);
                        const cellEnd = endOfDay(cellDate);
                        const allEventsForCell = [
                          ...monthEvents.filter((evt) => {
                            if (!isMultiDayEvent(evt)) return false;
                            const s = startOfDay(new Date(evt.startDate));
                            const e = startOfDay(new Date(evt.endDate));
                            return cellStart >= s && cellStart <= e;
                          }),
                          ...monthEvents.filter((evt) => {
                            if (!evt.allDay || isMultiDayEvent(evt)) return false;
                            return isSameDay(startOfDay(new Date(evt.startDate)), cellDate);
                          }),
                          ...monthEvents.filter((evt) => {
                            if (evt.allDay) return false;
                            const s = new Date(evt.startDate);
                            const e = new Date(evt.endDate);
                            return (
                              (s >= cellStart && s <= cellEnd) ||
                              (e >= cellStart && e <= cellEnd) ||
                              (s <= cellStart && e >= cellEnd)
                            );
                          }),
                        ];

                        return (
                          <div
                            key={cellDate.getTime()}
                            className={`relative border-b border-r border-border/30 transition-colors duration-100 ${
                              inDrag ? 'bg-primary/8' : 'hover:bg-accent/30'
                            }`}
                            style={{ minHeight: CELL_MIN_H }}
                            onPointerDown={(e) => handlePointerDown(cellDate, e)}
                            onPointerMove={() => handlePointerMove(cellDate)}
                            onPointerUp={(e) => handlePointerUp(cellDate, e)}
                          >
                            {/* 날짜 숫자 */}
                            <div className="flex items-center justify-between px-1.5 pt-1.5 pb-1" style={{ height: DATE_HEADER_H }}>
                              <span
                                className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0 ${
                                  today
                                    ? 'bg-primary text-primary-foreground font-bold'
                                    : colIdx === 0
                                    ? 'text-red-400'
                                    : colIdx === 6
                                    ? 'text-blue-400'
                                    : 'text-foreground/70'
                                }`}
                              >
                                {cellDate.getDate()}
                              </span>
                              {onCreateNewEvent && (
                                <button
                                  data-event-clickable
                                  onClick={(e) => { e.stopPropagation(); onCreateNewEvent(cellDate); }}
                                  className="opacity-0 hover:opacity-100 focus:opacity-100 p-0.5 rounded hover:bg-accent transition-opacity"
                                >
                                  <Plus className="w-3 h-3 text-muted-foreground" />
                                </button>
                              )}
                            </div>



                            {/* +N개 더보기 */}
                            {!isMobile && hidden > 0 && (
                              <div
                                data-event-clickable
                                className="absolute text-[10px] text-muted-foreground/70 hover:text-foreground cursor-pointer transition-colors px-1.5"
                                style={{ top: `${rowTop(MAX_VISIBLE_EVENTS) + 2}px` }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDayModalDate(cellDate);
                                  setDayModalEvents(allEventsForCell);
                                  setShowDayModal(true);
                                }}
                              >
                                +{hidden}개
                              </div>
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
        </div>
      );
    },
    [
      currentDate,
      isMobile,
      getEventsForMonth,
      isDateInDragRange,
      handlePointerDown,
      handlePointerMove,
      handlePointerUp,
      onCreateNewEvent,
      onEventDoubleClick,
    ]
  );

  return (
    <>
      <div
        ref={containerRef}
        className={`max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-hide ${
          dragRange ? 'touch-none select-none' : ''
        }`}
        onScroll={handleScroll}
      >
        {displayMonths.map((monthDate) => (
          <div key={monthKey(monthDate)}>{renderMonth(monthDate)}</div>
        ))}
      </div>

      {/* 이벤트 팝오버 카드 - 모바일: 화면 중앙 오버레이 */}
      {isMobile && selectedDate && bottomSheetEvents.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedDate(null);
              setBottomSheetEvents([]);
              bottomSheetOpenRef.current = true;
              setTimeout(() => { bottomSheetOpenRef.current = false; }, 400);
            }
          }}
        >
          <div
            className="bg-background rounded-2xl w-full shadow-2xl border border-border/40 overflow-hidden"
            style={{ maxWidth: '340px', maxHeight: '65vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
              <div>
                <span className="text-[11px] text-muted-foreground">{selectedDate.toLocaleDateString('ko-KR', { weekday: 'long' })}</span>
                <h3 className="text-sm font-bold">{selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일</h3>
              </div>
              <button
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-accent text-muted-foreground"
                onClick={() => {
                  setSelectedDate(null);
                  setBottomSheetEvents([]);
                  bottomSheetOpenRef.current = true;
                  setTimeout(() => { bottomSheetOpenRef.current = false; }, 400);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="overflow-y-auto p-3 space-y-2" style={{ maxHeight: 'calc(65vh - 56px)' }}>
              {bottomSheetEvents.map((evt) => {
                const s = getChipStyle(evt.color);
                return (
                  <div
                    key={evt.id}
                    className="flex items-start gap-2.5 p-3 rounded-xl cursor-pointer border active:opacity-70"
                    style={{ backgroundColor: s.bg, borderColor: s.border }}
                    onClick={() => {
                      setSelectedDate(null);
                      setBottomSheetEvents([]);
                      bottomSheetOpenRef.current = true;
                      setTimeout(() => { bottomSheetOpenRef.current = false; }, 400);
                      onEventDoubleClick(evt);
                    }}
                  >
                    <div className="w-1 rounded-full flex-shrink-0 self-stretch" style={{ backgroundColor: s.border, minHeight: '16px' }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ color: s.text }}>{evt.title}</div>
                      <div className="text-xs mt-0.5 opacity-70" style={{ color: s.text }}>
                        {evt.allDay ? (isMultiDayEvent(evt) ? `${new Date(evt.startDate).toLocaleDateString('ko-KR',{month:'short',day:'numeric'})} ~ ${new Date(evt.endDate).toLocaleDateString('ko-KR',{month:'short',day:'numeric'})}` : '종일') : `${fmtTime(evt.startDate)} - ${fmtTime(evt.endDate)}`}
                      </div>
                      {evt.description && <div className="text-xs mt-1 opacity-60 line-clamp-1" style={{ color: s.text }}>{evt.description}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 더보기 모달 - PC에서 +N개 더보기 클릭 시 */}
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
    </>
  );
}

export default Calendar;
