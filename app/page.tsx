'use client';

import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Calendar } from '@/components/calendar';
import { EventDialog } from '@/components/event-dialog';
import { EventDetailModal } from '@/components/event-detail-modal';
import { BottomNav } from '@/components/bottom-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { fetchAllCalendarEvents } from '@/lib/api'; // ✅ 변경: 전체 기간 전용
import type { RawCalendarEvent } from '@/types/calendar'; // Raw 타입만 사용

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
  const isMobile = useIsMobile();

  // 서버 응답 → 화면용 이벤트로 변환
  const mapRaw = (list: RawCalendarEvent[]): Event[] => {
    const palette = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-green-500',
      'bg-orange-500',
      'bg-pink-500',
    ];

    return list
      .map((raw, idx) => {
        // epoch(ms) 우선 → 없으면 ISO 파싱
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

        let startDate = new Date(startMs);
        let endDate = new Date(endMs);

        // 종일이면 end는 익일 00:00(exclusive) → 표시용 -1ms 보정
        if (raw.allDay && !Number.isNaN(endMs)) {
          endDate = new Date(endDate.getTime() - 1);
        }

        return {
          id: raw.id,
          title: raw.title ?? 'Untitled',
          description: (raw as any).description ?? '',
          startDate,
          endDate,
          color: palette[idx % palette.length],
          allDay: raw.allDay,
        } as Event;
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

  const handleSaveEvent = (event: Event) => {
    if (selectedEvent) {
      setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)));
    } else {
      setEvents((prev) => [...prev, { ...event, id: Date.now().toString() }]);
    }
    setIsDialogOpen(false);
    setSelectedEvent(null);
    setSelectedDateRange(null);
    setIsEditMode(false);
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    setIsDetailModalOpen(false);
    setIsDialogOpen(false);
    setSelectedEvent(null);
  };

  // 동기화 버튼: DB를 갱신하고 전체 재조회
  const syncNow = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const API_BASE =
        process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

      const res = await fetch(`${API_BASE}/api/calendar/sync`, {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });

      if (res.status === 401) {
        window.location.href = `${API_BASE}/oauth2/authorization/google`;
        return;
      }
      if (!res.ok) throw new Error('동기화 실패');

      const raw = await fetchAllCalendarEvents(); // ✅ 다시 전체 로드
      setEvents(mapRaw(raw as RawCalendarEvent[]));
    } catch (e: any) {
      setError(e?.message ?? '동기화 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
          <p className="text-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
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
            onEventDoubleClick={handleEventClick}
            onDateRangeSelect={handleDateRangeSelect}
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
  );
}
