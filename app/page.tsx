'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Calendar } from '@/components/calendar';
import { EventDialog } from '@/components/event-dialog';
import { EventDetailModal } from '@/components/event-detail-modal';
import { BottomNav } from '@/components/bottom-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProtectedRoute } from '@/components/protected-route';

import {
  fetchAllCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  API_BASE,
} from '@/lib/api';
import { mapRawToCalendarEvent } from '@/lib/calendar-utils';
import type { RawCalendarEvent, Event } from '@/types/calendar';
import { useEventRefresh } from '@/hooks/useEventRefresh';
import { fetchEvents } from '@/app/api/calendar/calendar';

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [colorMap, setColorMap] = useState<Map<string, string>>(new Map());

  const isMobile = useIsMobile();

  const { trigger, refresh } = useEventRefresh();

  const initialLoadDoneRef = useRef(false);
  const loadedMonthsRef = useRef<Set<string>>(new Set());
  const monthChangeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const mapRaw = (list: RawCalendarEvent[]): Event[] =>
    list
      .map((raw, idx) => {
        const baseEvent = mapRawToCalendarEvent(raw, idx);
        const existingColor = colorMap.get(raw.id);
        return {
          ...baseEvent,
          color: existingColor || baseEvent.color,
        };
      })
      .filter(
        (e) =>
          !Number.isNaN(e.startDate.getTime()) &&
          !Number.isNaN(e.endDate.getTime())
      )
      .sort(
        (a: Event, b: Event) => a.startDate.getTime() - b.startDate.getTime()
      );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const raw = await fetchAllCalendarEvents();
        if (cancelled) return;
        setEvents(mapRaw(raw as RawCalendarEvent[]));
        initialLoadDoneRef.current = true;
        raw.forEach((evt: RawCalendarEvent) => {
          if (evt.start) {
            const d = new Date(evt.start);
            loadedMonthsRef.current.add(`${d.getFullYear()}-${d.getMonth()}`);
          }
        });
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? '데이터를 불러올 수 없습니다');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  useEffect(() => {
    const sseUrl = `${API_BASE}/api/sse/events`;
    let es: EventSource;
    let retryTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      es = new EventSource(sseUrl, { withCredentials: true });

      // 개별 이벤트 변경 — 전체 재로드 없이 state만 패치
      es.addEventListener('events-changed', (e: MessageEvent) => {
        try {
          const { changed, deletedIds } = JSON.parse(e.data) as {
            changed: RawCalendarEvent[];
            deletedIds: string[];
          };
          setEvents((prev) => {
            let next = [...prev];
            if (deletedIds?.length) {
              next = next.filter((ev) => !deletedIds.includes(ev.id));
            }
            if (changed?.length) {
              for (const raw of changed) {
                const mapped = mapRawToCalendarEvent(raw, 0);
                const idx = next.findIndex((ev) => ev.id === mapped.id);
                if (idx >= 0) next[idx] = mapped;
                else next.push(mapped);
              }
              next.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
            }
            return next;
          });
        } catch {
          refresh(); // 파싱 실패 시 전체 새로고침 fallback
        }
      });

      // 전체 새로고침 fallback (수동 동기화 버튼 등)
      es.addEventListener('events-updated', () => {
        refresh();
      });

      es.onerror = () => {
        es.close();
        retryTimeout = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      clearTimeout(retryTimeout);
      es?.close();
    };
  }, [refresh]);

  const handleMonthChange = useCallback(
    async (months: Date[]) => {
      if (!initialLoadDoneRef.current) return;

      // 빠른 스크롤 시 버벅임 방지 — 300ms 디바운스
      clearTimeout(monthChangeTimerRef.current);
      monthChangeTimerRef.current = setTimeout(async () => {
        const newMonths = months.filter((m) => {
          const key = `${m.getFullYear()}-${m.getMonth()}`;
          return !loadedMonthsRef.current.has(key);
        });

        if (newMonths.length === 0) return;

        const sortedMonths = [...newMonths].sort(
          (a, b) => a.getTime() - b.getTime()
        );
        const startMonth = sortedMonths[0];
        const endMonth = sortedMonths[sortedMonths.length - 1];

        const startDate = new Date(
          startMonth.getFullYear(),
          startMonth.getMonth(),
          1
        );
        const endDate = new Date(
          endMonth.getFullYear(),
          endMonth.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );

        try {
          const raw = await fetchEvents({
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          });

          newMonths.forEach((m) => {
            loadedMonthsRef.current.add(`${m.getFullYear()}-${m.getMonth()}`);
          });

          if (raw.length > 0) {
            setEvents((prev) => {
              const existingIds = new Set(prev.map((e) => e.id));
              const newEvents = mapRaw(raw).filter((e) => !existingIds.has(e.id));
              if (newEvents.length === 0) return prev;
              return [...prev, ...newEvents].sort(
                (a, b) => a.startDate.getTime() - b.startDate.getTime()
              );
            });
          }
        } catch (err) {
          console.warn('[v0] 추가 이벤트 로드 실패:', err);
        }
      }, 300);
    },
    [colorMap]
  );

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setIsDetailModalOpen(true);
    setIsEditMode(false);
  };

  const handleDateRangeSelect = (start: Date, end: Date) => {
    setSelectedDateRange({ start, end });
    setSelectedEvent(null);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleEditEvent = (event: Event) => {
    setSelectedEvent(event);
    setIsEditMode(true);
    setIsDetailModalOpen(false);
    setIsDialogOpen(true);
  };

  const handleCreateNewEventFromBottomSheet = (date: Date) => {
    setSelectedDateRange({
      start: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
      end: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
    });
    setSelectedEvent(null);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const syncNow = () => {
    const base = API_BASE || 'http://localhost:8080';
    window.location.href = `${base}/oauth2/authorization/google`;
  };

  const handleSaveEvent = async (event: Event) => {
    setIsDialogOpen(false);
    setIsEditMode(false);

    const formatToISO = (
      date: Date,
      allDay: boolean,
      isEndDate: boolean
    ): string => {
      if (allDay) {
        const dateToUse = isEndDate
          ? new Date(date.getTime() + 24 * 60 * 60 * 1000)
          : date;
        const year = dateToUse.getFullYear();
        const month = String(dateToUse.getMonth() + 1).padStart(2, '0');
        const day = String(dateToUse.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      return date.toISOString();
    };

    const isAllDay = Boolean(event.allDay);

    const requestPayload = {
      title: event.title || '무제',
      description: event.description || '',
      start: formatToISO(event.startDate, isAllDay, false),
      end: formatToISO(event.endDate, isAllDay, isAllDay),
      allDay: isAllDay,
      timeZone: 'Asia/Seoul',
      color: event.color,
    };

    const tempId = selectedEvent ? selectedEvent.id : `temp-${Date.now()}`;
    const optimisticEvent: Event = { ...event, id: tempId };

    const previousEvents = [...events];

    setError(null);
    if (selectedEvent) {
      setEvents((prev) =>
        prev.map((e) => (e.id === tempId ? optimisticEvent : e))
      );
    } else {
      setEvents((prev) => [...prev, optimisticEvent]);
    }

    try {
      if (selectedEvent) {
        const realEvent = await updateCalendarEvent(tempId, requestPayload);
        setEvents((prev) =>
          prev.map((e) => (e.id === tempId ? mapRaw([realEvent])[0] : e))
        );
        setColorMap((prev) =>
          new Map(prev).set(realEvent.id, realEvent.color || '')
        );
      } else {
        const realEvent = await createCalendarEvent(requestPayload);
        setEvents((prev) =>
          prev.map((e) => (e.id === tempId ? mapRaw([realEvent])[0] : e))
        );
        setColorMap((prev) =>
          new Map(prev).set(realEvent.id, realEvent.color || '')
        );
      }
    } catch (err: any) {
      console.error('[v0] 이벤트 저장 실패:', err);
      setError(err?.message ?? '일정 저장 중 오류가 발생했습니다');
      setEvents(previousEvents);
    } finally {
      setSelectedEvent(null);
      setSelectedDateRange(null);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    const eventToDelete = events.find((e) => e.id === eventId);
    if (!eventToDelete) return;

    const previousEvents = [...events];

    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    setIsDetailModalOpen(false);
    setIsDialogOpen(false);
    setSelectedEvent(null);
    setError(null);

    try {
      await deleteCalendarEvent(eventId);
      setColorMap((prev) => {
        const next = new Map(prev);
        next.delete(eventId);
        return next;
      });
    } catch (err: any) {
      console.error('[v0] 이벤트 삭제 실패:', err);
      setError(err?.message ?? '삭제 중 오류가 발생했습니다');
      setEvents(previousEvents);
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/40">
          <div className="flex items-center justify-between px-4 h-12">
            <h1 className="text-sm font-semibold text-foreground tracking-tight">
              맞춰봄
            </h1>
            <div className="flex items-center gap-1">
              <button
                onClick={syncNow}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-accent transition-colors"
                title="구글 캘린더에서 최신 일정 동기화"
              >
                동기화
              </button>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="px-2 pt-0 pb-4">
            {error && (
              <Alert variant="destructive" className="mb-3 whitespace-pre-line">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isLoading ? (
              <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
                캘린더를 불러오는 중입니다...
              </div>
            ) : (
              <Calendar
                events={events}
                onEventDoubleClick={handleEventClick}
                onDateRangeSelect={handleDateRangeSelect}
                onCreateNewEvent={handleCreateNewEventFromBottomSheet}
                onMonthChange={handleMonthChange}
              />
            )}
          </div>
        </main>

        <EventDetailModal
          open={isDetailModalOpen}
          onOpenChange={setIsDetailModalOpen}
          event={selectedEvent}
          onDelete={handleDeleteEvent}
          onEdit={handleEditEvent}
        />

        <EventDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          event={isEditMode ? selectedEvent : null}
          dateRange={isEditMode ? selectedDateRange : null}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
        />

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
