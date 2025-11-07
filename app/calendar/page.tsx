'use client';

import { useState } from 'react';
import { Calendar } from '@/components/calendar';
import { EventDialog } from '@/components/event-dialog';
import { EventDetailModal } from '@/components/event-detail-modal';
import { BottomNav } from '@/components/bottom-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { Alert, AlertDescription } from '@/components/ui/alert';

// 이 페이지에서는 별도 fetch를 하지 않습니다.
// Calendar 컴포넌트가 내부에서 fetchAllCalendarEvents()로 전체 기간을 로드합니다.

export type Event = {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  color: string;
  allDay?: boolean;
};

export default function CalendarPage() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    // 이 페이지에서는 로컬 상태만 다루므로 캘린더 UI 편집 모달만 닫아줍니다.
    setIsDialogOpen(false);
    setSelectedEvent(null);
    setSelectedDateRange(null);
    setIsEditMode(false);
  };

  const handleDeleteEvent = (_eventId: string) => {
    setIsDetailModalOpen(false);
    setIsDialogOpen(false);
    setSelectedEvent(null);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-16">
      <header className="border-b border-border bg-card px-4 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">캘린더</h1>
        <div className="flex items-center gap-2">
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
