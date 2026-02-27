'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Trash2 } from 'lucide-react';
import type { Event } from '@/types/calendar';

type EventDetailModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event | null;
  onDelete: (eventId: string) => void;
  onEdit: (event: Event) => void;
};

export function EventDetailModal({
  open,
  onOpenChange,
  event,
  onDelete,
  onEdit,
}: EventDetailModalProps) {
  if (!event) return null;

  const handleDelete = () => {
    if (confirm('이 일정을 삭제하시겠습니까?')) {
      onDelete(event.id);
      onOpenChange(false);
    }
  };

  const formatDateTime = (date: Date) =>
    new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);

  const formatRange = (start: Date, end: Date) => {
    // 같은 날이면 시간만 다르게, 아니면 전체 표시
    const sameDay =
      start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth() &&
      start.getDate() === end.getDate();
    if (sameDay) {
      const d = new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(start);
      const hm = new Intl.DateTimeFormat('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return `${d} ${hm.format(start)} ~ ${hm.format(end)}`;
    }
    return `${formatDateTime(start)} ~ ${formatDateTime(end)}`;
  };

  const durationLabel = (() => {
    const diff = Math.max(
      0,
      event.endDate.getTime() - event.startDate.getTime()
    );
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}시간 ${minutes}분`;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden rounded-2xl gap-0">
        <DialogDescription className="sr-only">일정 상세 정보</DialogDescription>

        {/* 컬러 헤더 바 */}
        <div className={`h-1.5 w-full ${event.color}`} />

        <div className="p-5">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-base font-semibold text-foreground leading-snug">
              {event.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {event.description && (
              <div className="text-sm text-muted-foreground bg-accent/40 rounded-lg px-3 py-2.5 leading-relaxed">
                {event.description}
              </div>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2.5 text-muted-foreground">
                <span className="text-xs font-medium text-foreground/50 w-12 pt-0.5 flex-shrink-0">기간</span>
                <span className="text-foreground/80">{formatRange(event.startDate, event.endDate)}</span>
              </div>
              {!event.allDay && (
                <div className="flex items-start gap-2.5 text-muted-foreground">
                  <span className="text-xs font-medium text-foreground/50 w-12 pt-0.5 flex-shrink-0">시간</span>
                  <span className="text-foreground/80">{durationLabel}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-5 pb-5">
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 text-xs text-destructive hover:bg-destructive/8 px-3 py-2 rounded-lg transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            삭제
          </button>
          <div className="flex-1" />
          <button
            onClick={() => onOpenChange(false)}
            className="text-xs text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-accent transition-colors"
          >
            닫기
          </button>
          <button
            onClick={() => { onEdit(event); onOpenChange(false); }}
            className="text-xs font-medium bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            편집
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
