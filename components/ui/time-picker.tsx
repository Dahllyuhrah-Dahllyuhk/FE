'use client';

import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TimePickerProps {
  value: string; // "HH:MM"
  onChange: (value: string) => void;
  className?: string;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 10, 20, 30, 40, 50];

export function TimePicker({ value, onChange, className }: TimePickerProps) {
  const [h, m] = value.split(':').map(Number);
  const hour = isNaN(h) ? 9 : h;
  const minute = isNaN(m) ? 0 : m;
  const normalizedMinute = Math.round(minute / 10) * 10 % 60;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Select
        value={String(hour)}
        onValueChange={(v) => onChange(`${pad(Number(v))}:${pad(normalizedMinute)}`)}
      >
        <SelectTrigger className="flex-1 min-w-0 font-mono text-sm h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-52">
          {HOURS.map((hh) => (
            <SelectItem key={hh} value={String(hh)} className="font-mono text-sm">
              {pad(hh)}시
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-muted-foreground/60 text-sm flex-shrink-0">:</span>

      <Select
        value={String(normalizedMinute)}
        onValueChange={(v) => onChange(`${pad(hour)}:${pad(Number(v))}`)}
      >
        <SelectTrigger className="flex-1 min-w-0 font-mono text-sm h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map((mm) => (
            <SelectItem key={mm} value={String(mm)} className="font-mono text-sm">
              {pad(mm)}분
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
