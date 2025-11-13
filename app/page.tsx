'use client';

import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Calendar } from '@/components/calendar';
import { EventDialog } from '@/components/event-dialog';
import { EventDetailModal } from '@/components/event-detail-modal';
import { BottomNav } from '@/components/bottom-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProtectedRoute } from '@/components/protected-route'; // ✅ 변경: ProtectedRoute 추가

import {
  fetchAllCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '@/lib/api'; // ✅ 변경: 전체 기간 전용 및 CRUD 함수 추가
import { mapRawToCalendarEvent } from '@/lib/calendar-utils';
import type { RawCalendarEvent } from '@/types/calendar';

// 화면에서 쓰는 이벤트 타입 (로컬 정의: 외부 의존 제거)
export type Event = {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  color: string;
  allDay?: boolean;
};

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

  // 서버 응답 → 화면용 이벤트로 변환
  const mapRaw = (list: RawCalendarEvent[]): Event[] => {
    return list
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
  };

  // 최초 전체 로드
  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const raw = await fetchAllCalendarEvents(); // ✅ 쿼리 파라미터 없음(전체)
        setEvents(mapRaw(raw as RawCalendarEvent[]));
      } catch (err: any) {
        setError(err?.message ?? '데이터를 불러올 수 없습니다');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setIsEditMode(false);
    setIsDialogOpen(false);
    setIsDetailModalOpen(true);
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

  const handleSaveEvent = async (event: Event) => {
    setIsDialogOpen(false);
    if (event.id) {
      setColorMap((prev) => new Map(prev).set(event.id, event.color));
    }
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
        } else {
          return date.toISOString();
        }
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
        setEvents((prev) =>
          prev.map((e) =>
            e.id === selectedEvent.id ? { ...event, id: selectedEvent.id } : e
          )
        );
        await updateCalendarEvent(selectedEvent.id, requestPayload);
      } else {
        const tempId = `temp-${Date.now()}`;
        setEvents((prev) => [...prev, { ...event, id: tempId }]);
        const created = await createCalendarEvent(requestPayload);
        if (created?.id) {
          setColorMap((prev) => new Map(prev).set(created.id, event.color));
        }
      }

      const raw = await fetchAllCalendarEvents();
      setEvents(mapRaw(raw as RawCalendarEvent[]));
    } catch (err: any) {
      setError(err?.message ?? '일정 저장 중 오류가 발생했습니다');
      const raw = await fetchAllCalendarEvents();
      setEvents(mapRaw(raw as RawCalendarEvent[]));
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    setIsDetailModalOpen(false);
    setIsDialogOpen(false);
    setSelectedEvent(null);

    try {
      setError(null);
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      setColorMap((prev) => {
        const newMap = new Map(prev);
        newMap.delete(eventId);
        return newMap;
      });

      await deleteCalendarEvent(eventId);

      const raw = await fetchAllCalendarEvents();
      setEvents(mapRaw(raw as RawCalendarEvent[]));
    } catch (err: any) {
      if (err?.message?.includes('410')) {
        setError('이미 삭제된 일정입니다. 동기화를 진행합니다.');
      } else {
        setError(err?.message ?? '일정 삭제 중 오류가 발생했습니다');
      }
      const raw = await fetchAllCalendarEvents();
      setEvents(mapRaw(raw as RawCalendarEvent[]));
    }
  };

  const syncNow = () => {
    const API_BASE =
      process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8080';
    // ✅ 동기화 버튼을 눌렀을 때만 구글 OAuth 시작
    window.location.href = `${API_BASE}/oauth2/authorization/google`;
  };

  const handleCreateNewEventFromBottomSheet = (date: Date) => {
    setSelectedDateRange({
      start: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
      end: new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        23,
        59,
        59
      ),
    });
    setSelectedEvent(null);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
            <p className="text-foreground">로딩 중...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-background pb-16">
        <header className="border-b border-border bg-card px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">캘린더</h1>
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
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Calendar
              events={events}
              onEventDoubleClick={handleEventClick}
              onDateRangeSelect={handleDateRangeSelect}
              onCreateNewEvent={handleCreateNewEventFromBottomSheet}
            />
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
