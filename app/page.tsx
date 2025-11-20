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

  // 📌 [제거] 낙관적 UI에서는 'isSubmitting' state가 필요 없습니다.
  // const [isSubmitting, setIsSubmitting] = useState(false);

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
  // 저장 / 삭제 (📌 [수정] 낙관적 UI 로직으로 전체 교체)
  // =============================

  const handleSaveEvent = async (event: Event) => {
    // 1. (즉각 반응) 대화상자를 즉시 닫음
    setIsDialogOpen(false);
    setIsEditMode(false);

    // 2. (즉각 반응) API 요청에 필요한 payload 미리 준비
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

    // 3. (즉각 반응) 임시 ID 및 가짜 이벤트 생성
    // (selectedEvent가 있으면 '수정', 없으면 '생성')
    const tempId = selectedEvent ? selectedEvent.id : `temp-${Date.now()}`;
    const optimisticEvent: Event = { ...event, id: tempId };

    // 4. (즉각 반응) UI에 낙관적 결과 선반영
    setError(null);
    if (selectedEvent) {
      // (수정)
      setEvents((prev) =>
        prev.map((e) => (e.id === tempId ? optimisticEvent : e))
      );
    } else {
      // (생성)
      setEvents((prev) => [...prev, optimisticEvent]);
    }

    // 5. (백그라운드) API 호출 시작
    try {
      if (selectedEvent) {
        // (수정)
        const realEvent = await updateCalendarEvent(tempId, requestPayload);
        // (성공) UI의 이벤트를 '진짜' 이벤트로 교체 (mapRaw 사용)
        setEvents((prev) =>
          prev.map((e) => (e.id === tempId ? mapRaw([realEvent])[0] : e))
        );
        // 색상 맵 업데이트
        setColorMap((prev) =>
          new Map(prev).set(realEvent.id, realEvent.color || '')
        );
      } else {
        // (생성)
        const realEvent = await createCalendarEvent(requestPayload);
        // (성공) UI의 '임시' 이벤트를 '진짜' 이벤트(Google ID)로 교체
        setEvents((prev) =>
          prev.map((e) => (e.id === tempId ? mapRaw([realEvent])[0] : e))
        );
        // 색상 맵 업데이트
        setColorMap((prev) =>
          new Map(prev).set(realEvent.id, realEvent.color || '')
        );
      }
    } catch (err: any) {
      // 6. (실패) API 실패 시
      setError(err?.message ?? '일정 저장 중 오류가 발생했습니다');
      // (실패) UI에 반영했던 '낙관적' 결과 되돌리기
      if (selectedEvent) {
        // (수정 실패) -> 간단하게 전체 목록을 다시 불러와 복구
        refresh();
      } else {
        // (생성 실패) -> UI에서 임시 이벤트 제거
        setEvents((prev) => prev.filter((e) => e.id !== tempId));
      }
    } finally {
      // (정리)
      setSelectedEvent(null);
      setSelectedDateRange(null);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    // 1. (즉각 반응) 삭제할 이벤트를 UI에서 미리 제거
    const eventToDelete = events.find((e) => e.id === eventId);
    if (!eventToDelete) return; // 이미 없으면 무시

    setEvents((prev) => prev.filter((e) => e.id !== eventId));

    // (즉각 반응) 모달 닫기
    setIsDetailModalOpen(false);
    setIsDialogOpen(false);
    setSelectedEvent(null);
    setError(null);

    // 2. (백그라운드) API 호출
    try {
      await deleteCalendarEvent(eventId);
      // (성공) -> UI는 이미 반영됨. 색상 캐시만 제거.
      setColorMap((prev) => {
        const next = new Map(prev);
        next.delete(eventId);
        return next;
      });
    } catch (err: any) {
      // 3. (실패) API 실패 시
      setError(err?.message ?? '삭제 중 오류가 발생했습니다');
      // (실패) UI 되돌리기: 삭제했던 이벤트를 다시 추가
      setEvents((prev) => [...prev, eventToDelete]);
    }
    // 🚨 삭제 후 refresh()는 더 이상 필요 없음
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
          // 📌 [제거] isSubmitting prop 제거
          // isSubmitting={isSubmitting}
        />

        <EventDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          event={isEditMode ? selectedEvent : null}
          dateRange={isEditMode ? selectedDateRange : null}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
          // 📌 [제거] isSubmitting prop 제거
          // isSubmitting={isSubmitting}
        />

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
