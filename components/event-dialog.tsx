'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar, Clock, AlignLeft, Palette, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import type { Event } from '@/types/calendar';
import { DateRangePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';

type EventDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event | null;
  dateRange: { start: Date; end: Date } | null;
  onSave: (event: Event) => void;
  onDelete: (eventId: string) => void;
};

const colors = [
  { name: '파랑', value: 'bg-blue-500', hex: '#3b82f6' },
  { name: '보라', value: 'bg-purple-500', hex: '#a855f7' },
  { name: '초록', value: 'bg-green-500', hex: '#22c55e' },
  { name: '빨강', value: 'bg-red-500', hex: '#ef4444' },
  { name: '주황', value: 'bg-orange-500', hex: '#f97316' },
];

export function EventDialog({
  open,
  onOpenChange,
  event,
  dateRange: dateRange_init,
  onSave,
  onDelete,
}: EventDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [color, setColor] = useState('bg-blue-500');
  const [allDay, setAllDay] = useState(true);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description);
      const isAD = event.allDay ?? true;
      setAllDay(isAD);
      const s = new Date(event.startDate);
      const e = new Date(event.endDate);
      setDateRange({ from: s, to: e });
      if (!isAD) {
        setStartTime(`${String(s.getHours()).padStart(2,'0')}:${String(s.getMinutes()).padStart(2,'0')}`);
        setEndTime(`${String(e.getHours()).padStart(2,'0')}:${String(e.getMinutes()).padStart(2,'0')}`);
      }
      setColor(event.color);
    } else if (dateRange_init) {
      setTitle('');
      setDescription('');
      setAllDay(true);
      setDateRange({ from: dateRange_init.start, to: dateRange_init.end });
      setStartTime('09:00');
      setEndTime('10:00');
      setColor('bg-blue-500');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, dateRange_init]);

  useEffect(() => {
    if (!allDay) {
      if (!startTime) setStartTime('09:00');
      if (!endTime) setEndTime('10:00');
    }
  }, [allDay]);

  const buildDate = (date: Date, time: string): Date => {
    const [h, m] = time.split(':').map(Number);
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    return d;
  };

  const handleSave = () => {
    const from = dateRange?.from ?? new Date();
    const to = dateRange?.to ?? from;

    const finalStart = allDay
      ? (() => { const d = new Date(from); d.setHours(0,0,0,0); return d; })()
      : buildDate(from, startTime);
    const finalEnd = allDay
      ? (() => { const d = new Date(to); d.setHours(23,59,59,999); return d; })()
      : buildDate(to, endTime);

    const newEvent: Event = {
      id: event?.id || Date.now().toString(),
      title,
      description,
      startDate: finalStart,
      endDate: finalEnd,
      color,
      allDay,
    };
    onSave(newEvent);
    resetForm();
  };

  const handleDelete = () => {
    if (event) {
      onDelete(event.id);
      resetForm();
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDateRange(undefined);
    setStartTime('09:00');
    setEndTime('10:00');
    setColor('bg-blue-500');
    setAllDay(true);
  };

  const selectedColorHex = colors.find((c) => c.value === color)?.hex ?? '#3b82f6';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] max-h-[85vh] overflow-y-auto p-0 gap-0 rounded-2xl">
        {/* 컬러 액센트 바 */}
        <div className="h-1 w-full rounded-t-2xl transition-colors duration-200" style={{ backgroundColor: selectedColorHex }} />

        <div className="px-5 pt-4 pb-2">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {event ? '일정 편집' : '새 일정'}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* 제목 */}
          <div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="일정 제목"
              className="text-base font-medium border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-b-primary h-10"
            />
          </div>

          {/* 종일 토글 */}
          <div className="flex items-center justify-between gap-3 rounded-xl bg-accent/40 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-medium">종일</span>
            </div>
            <Switch checked={allDay} onCheckedChange={setAllDay} />
          </div>

          {/* 날짜/시간 */}
          <div className="rounded-xl border border-border/60 overflow-hidden">
            <div className="flex items-start gap-3 px-4 py-3 border-b border-border/40">
              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <Label className="text-[11px] text-muted-foreground block mb-1.5">날짜</Label>
                <DateRangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  placeholder="날짜 범위 선택"
                />
              </div>
            </div>
            {!allDay && (
              <div className="flex items-start gap-3 px-4 py-3">
                <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-2.5" />
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground w-8 flex-shrink-0">시작</span>
                    <TimePicker value={startTime} onChange={setStartTime} className="flex-1 min-w-0" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground w-8 flex-shrink-0">종료</span>
                    <TimePicker value={endTime} onChange={setEndTime} className="flex-1 min-w-0" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 설명 */}
          <div className="rounded-xl border border-border/60 px-4 py-3">
            <div className="flex items-start gap-2.5">
              <AlignLeft className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="메모 추가..."
                rows={2}
                className="border-0 px-0 text-sm focus-visible:ring-0 resize-none bg-transparent min-h-0"
              />
            </div>
          </div>

          {/* 색상 */}
          <div className="flex items-center gap-3 rounded-xl border border-border/60 px-4 py-3">
            <Palette className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex items-center gap-2 flex-1">
              {colors.map((c) => (
                <button
                  key={c.value}
                  className="relative h-7 w-7 rounded-full transition-transform hover:scale-110 active:scale-95"
                  style={{ backgroundColor: c.hex }}
                  onClick={() => setColor(c.value)}
                  type="button"
                  title={c.name}
                >
                  {color === c.value && (
                    <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-row items-center gap-2 px-5 pb-5 pt-0">
          {event && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 text-xs text-destructive hover:bg-destructive/8 px-3 py-2 rounded-lg transition-colors mr-auto"
            >
              <Trash2 className="h-3.5 w-3.5" />
              삭제
            </button>
          )}
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-muted-foreground">
            취소
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!title.trim() || !dateRange?.from}
            style={{ backgroundColor: selectedColorHex }}
            className="text-white hover:opacity-90"
          >
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
