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
import type { Event } from '@/types/calendar';

type EventDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event | null;
  dateRange: { start: Date; end: Date } | null;
  onSave: (event: Event) => void;
  onDelete: (eventId: string) => void;
};

const colors = [
  { name: '파랑', value: 'bg-blue-500' },
  { name: '보라', value: 'bg-purple-500' },
  { name: '초록', value: 'bg-green-500' },
  { name: '빨강', value: 'bg-red-500' },
  { name: '주황', value: 'bg-orange-500' },
];

export function EventDialog({
  open,
  onOpenChange,
  event,
  dateRange,
  onSave,
  onDelete,
}: EventDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [color, setColor] = useState('bg-blue-500');
  const [allDay, setAllDay] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description);
      setAllDay(event.allDay || false);
      setStartDate(formatDateTimeLocal(event.startDate, event.allDay || false));
      setEndDate(formatDateTimeLocal(event.endDate, event.allDay || false));
      setColor(event.color);
    } else if (dateRange) {
      setTitle('');
      setDescription('');
      setAllDay(false);
      setStartDate(formatDateTimeLocal(dateRange.start, false));
      setEndDate(formatDateTimeLocal(dateRange.end, false));
      setColor('bg-blue-500');
    }
  }, [event, dateRange]);

  const formatDateTimeLocal = (date: Date, isAllDay: boolean) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    if (isAllDay) {
      // For all-day events, return date only
      return `${year}-${month}-${day}`;
    }

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleSave = () => {
    const newEvent: Event = {
      id: event?.id || Date.now().toString(),
      title,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
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
    setStartDate('');
    setEndDate('');
    setColor('bg-blue-500');
    setAllDay(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{event ? '일정 편집' : '새 일정'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">제목</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="일정 제목"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="일정 설명"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 bg-card">
            <Label htmlFor="allday" className="cursor-pointer font-medium">
              종일
            </Label>
            <Switch id="allday" checked={allDay} onCheckedChange={setAllDay} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="start">{allDay ? '시작 날짜' : '시작 시간'}</Label>
            <Input
              id="start"
              type={allDay ? 'date' : 'datetime-local'}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="end">{allDay ? '종료 날짜' : '종료 시간'}</Label>
            <Input
              id="end"
              type={allDay ? 'date' : 'datetime-local'}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>색상</Label>
            <div className="flex gap-2">
              {colors.map((c) => (
                <button
                  key={c.value}
                  className={`h-8 w-8 rounded-full ${c.value} ${
                    color === c.value
                      ? 'ring-2 ring-foreground ring-offset-2'
                      : ''
                  }`}
                  onClick={() => setColor(c.value)}
                  type="button"
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {event && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="sm:mr-auto"
            >
              삭제
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSave}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
