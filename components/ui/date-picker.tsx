'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

/* ─── Single Date Picker ─── */
interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = '날짜 선택',
  disabled = false,
  minDate,
  maxDate,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-10 w-full items-center gap-2 rounded-xl border border-border/60 bg-background px-3 text-sm transition-colors',
            'hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-primary/30',
            'disabled:cursor-not-allowed disabled:opacity-50',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <span className="flex-1 text-left">
            {value ? format(value, 'yyyy년 M월 d일 (E)', { locale: ko }) : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange(date);
            setOpen(false);
          }}
          disabled={(date) => {
            if (minDate && date < minDate) return true;
            if (maxDate && date > maxDate) return true;
            return false;
          }}
          initialFocus
          locale={ko}
        />
      </PopoverContent>
    </Popover>
  );
}

/* ─── Date Range Picker ─── */
interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  className?: string;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = '날짜 범위 선택',
  disabled = false,
  minDate,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const label = value?.from
    ? value.to
      ? `${format(value.from, 'M월 d일 (E)', { locale: ko })} – ${format(value.to, 'M월 d일 (E)', { locale: ko })}`
      : format(value.from, 'yyyy년 M월 d일 (E)', { locale: ko })
    : placeholder;

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-10 w-full items-center gap-2 rounded-xl border border-border/60 bg-background px-3 text-sm transition-colors',
            'hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-primary/30',
            'disabled:cursor-not-allowed disabled:opacity-50',
            !value?.from && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <span className="flex-1 text-left">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={value}
          onSelect={onChange}
          disabled={(date) => (minDate ? date < minDate : false)}
          initialFocus
          locale={ko}
          numberOfMonths={1}
        />
      </PopoverContent>
    </Popover>
  );
}
