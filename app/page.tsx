'use client';

import { useEffect, useState } from 'react';
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

  // 🔥 전역 refresh 트리거
  const { trigger, refresh } = useEventRefresh();

  // 서버 응답 → 화면용 이벤트로 변환
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

  // ✅ trigger가 바뀔 때마다 전체 이벤트 다시 로딩
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const raw = await fetchAllCalendarEvents();
        if (cancelled) return;
        setEvents(mapRaw(raw as RawCalendarEvent[]));
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

  // ✅ SSE 구독: BE(Webhook/증분 동기화) → FE 실시간 반영
  useEffect(() => {
    const sseUrl = `${API_BASE}/api/sse/events`;
    const es = new EventSource(sseUrl);

    es.addEventListener('events-updated', () => {
      refresh();
    });

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
    };
  }, [refresh]);

  // =============================
  // 캘린더 인터랙션 핸들러들
  // =============================

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

  // ✅ 동기화 버튼: 구글 OAuth 시작
  const syncNow = () => {
    const base = API_BASE || 'http://localhost:8080';
    window.location.href = `${base}/oauth2/authorization/google`;
  };

  // =============================
  // 저장 / 삭제
  // =============================

  const handleSaveEvent = async (event: Event) => {
    setIsDialogOpen(false);
    setSelectedEvent(null);
    setSelectedDateRange(null);
    setIsEditMode(false);

    try {
      setError(null);

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

      if (selectedEvent) {
        // 수정
        await updateCalendarEvent(selectedEvent.id, requestPayload);

        // 색상 override
        setColorMap((prev) => {
          const next = new Map(prev);
          next.set(selectedEvent.id, event.color);
          return next;
        });
      } else {
        // 생성
        const created = await createCalendarEvent(requestPayload);
        if (created?.id) {
          setColorMap((prev) => {
            const next = new Map(prev);
            next.set(created.id, event.color);
            return next;
          });
        }
      }
    } catch (err: any) {
      setError(err?.message ?? '일정 저장 중 오류가 발생했습니다');
    } finally {
      // ✅ 실제 목록은 항상 서버 기준으로 다시 로딩
      refresh();
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    setIsDetailModalOpen(false);
    setIsDialogOpen(false);
    setSelectedEvent(null);

    try {
      setError(null);
      await deleteCalendarEvent(eventId);

      // 색상 캐시 제거
      setColorMap((prev) => {
        const next = new Map(prev);
        next.delete(eventId);
        return next;
      });
    } catch (err: any) {
      if ((err as any)?.message?.includes('410')) {
        setError('이미 삭제된 일정입니다. 동기화를 진행합니다.');
      } else {
        setError(err?.message ?? '일정 삭제 중 오류가 발생했습니다');
      }
    } finally {
      // ✅ 삭제 후에도 서버 기준으로 다시 로딩
      refresh();
    }
  };

  // =============================
  // 렌더
  // =============================

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">
                맞춰봄 캘린더
              </span>
              <h1 className="text-lg font-semibold md:text-xl">
                {isMobile ? '내 일정' : '내 캘린더'}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={syncNow}
                className="rounded-md border px-3 py-1 text-sm hover:bg-accent"
                title="구글 캘린더에서 최신 일정 동기화"
              >
                동기화
              </button>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4">
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
