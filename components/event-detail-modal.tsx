'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Trash2, Clock, Calendar, AlignLeft, Pencil } from 'lucide-react';
import type { Event } from '@/types/calendar';

const COLOR_HEX: Record<string, string> = {
  'bg-blue-500': '#3b82f6',
  'bg-purple-500': '#a855f7',
  'bg-green-500': '#22c55e',
  'bg-red-500': '#ef4444',
  'bg-orange-500': '#f97316',
  'bg-yellow-500': '#eab308',
  'bg-pink-500': '#ec4899',
  'bg-teal-500': '#14b8a6',
  'bg-indigo-500': '#6366f1',
  'bg-cyan-500': '#06b6d4',
};
const getHex = (cls: string) => COLOR_HEX[cls] ?? '#6b7280';

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

  const fmtDate = (d: Date) =>
    new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(d);

  const fmtTime = (d: Date) =>
    new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit' }).format(d);

  const hex = getHex(event.color);

  const isSameDay =
    new Date(event.startDate).toDateString() === new Date(event.endDate).toDateString();

  const dateLabel = event.allDay
    ? isSameDay
      ? fmtDate(new Date(event.startDate))
      : `${fmtDate(new Date(event.startDate))} ~ ${fmtDate(new Date(event.endDate))}`
    : isSameDay
    ? fmtDate(new Date(event.startDate))
    : `${fmtDate(new Date(event.startDate))} ~ ${fmtDate(new Date(event.endDate))}`;

  const timeLabel = !event.allDay
    ? `${fmtTime(new Date(event.startDate))} – ${fmtTime(new Date(event.endDate))}`
    : '종일';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px] p-0 overflow-hidden rounded-2xl gap-0">
        <DialogDescription className="sr-only">일정 상세 정보</DialogDescription>

        {/* 컬러 헤더 */}
        <div className="h-1.5 w-full" style={{ backgroundColor: hex }} />

        <div className="px-5 pt-4 pb-2">
          <DialogHeader>
            <div className="flex items-start gap-2.5">
              <div className="w-3 h-3 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: hex }} />
              <DialogTitle className="text-base font-semibold text-foreground leading-snug flex-1">
                {event.title}
              </DialogTitle>
            </div>
          </DialogHeader>
        </div>

        <div className="px-5 pb-4 space-y-2.5">
          {/* 날짜 */}
          <div className="flex items-start gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <span className="text-sm text-foreground/80">{dateLabel}</span>
          </div>

          {/* 시간 */}
          <div className="flex items-start gap-3">
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <span className="text-sm text-foreground/80">{timeLabel}</span>
          </div>

          {/* 설명 */}
          {event.description && (
            <div className="flex items-start gap-3">
              <AlignLeft className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-sm text-foreground/70 leading-relaxed">{event.description}</p>
            </div>
          )}
        </div>

        {/* 액션 바 */}
        <div className="flex items-center gap-1 px-5 py-3 border-t border-border/40">
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
            className="flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: hex }}
          >
            <Pencil className="h-3 w-3" />
            편집
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
