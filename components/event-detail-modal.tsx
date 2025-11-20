'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span
              className={`h-4 w-4 rounded-full ${event.color}`}
              aria-hidden="true"
            />
            {event.title}
          </DialogTitle>

          {/* ✅ 접근성 설명 추가: 경고 해소 */}
          <DialogDescription className="sr-only" id="event-detail-desc">
            일정 상세 정보: {event.title}. 시작{' '}
            {formatDateTime(event.startDate)}, 종료{' '}
            {formatDateTime(event.endDate)}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4" aria-describedby="event-detail-desc">
          <div className="grid gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              설명
            </h3>
            <p className="text-sm text-foreground">
              {event.description || '설명 없음'}
            </p>
          </div>

          <div className="grid gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              기간
            </h3>
            <p className="text-sm text-foreground">
              {formatRange(event.startDate, event.endDate)}
            </p>
          </div>

          <div className="grid gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              진행 시간
            </h3>
            <p className="text-sm text-foreground">{durationLabel}</p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            className="sm:mr-auto"
            aria-label="일정 삭제"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            삭제
          </Button>

          <Button variant="outline" onClick={() => onOpenChange(false)}>
            닫기
          </Button>

          <Button
            onClick={() => {
              onEdit(event);
              onOpenChange(false);
            }}
          >
            편집
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
