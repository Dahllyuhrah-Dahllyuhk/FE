'use client';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TimeWheelPicker } from '@/components/time-wheel-picker';

type TimeSlot = {
  id: string;
  day: number;
  startTime: string;
  endTime: string;
  title: string;
  color: string;
};

type TimetableItem = {
  id: string;
  title: string;
  day: string;
  startTime: string;
  endTime: string;
  color: string;
};

type Timetable = {
  id: string;
  name: string;
  items: TimetableItem[];
};

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
const HOUR_START = 6;
const HOUR_END = 24;
const TOTAL_HOURS = HOUR_END - HOUR_START;
const ROW_HEIGHT = 48; // px per hour

const COLORS = [
  { value: '#818cf8', label: '인디고' },
  { value: '#60a5fa', label: '블루' },
  { value: '#34d399', label: '그린' },
  { value: '#fbbf24', label: '옐로우' },
  { value: '#f87171', label: '레드' },
  { value: '#c084fc', label: '퍼플' },
  { value: '#fb923c', label: '오렌지' },
  { value: '#94a3b8', label: '슬레이트' },
];

const DAY_MAP: { [key: string]: number } = {
  MONDAY: 0, TUESDAY: 1, WEDNESDAY: 2, THURSDAY: 3,
  FRIDAY: 4, SATURDAY: 5, SUNDAY: 6,
};

const DAY_NAMES = [
  'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY',
  'FRIDAY', 'SATURDAY', 'SUNDAY',
];

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function getSlotStyle(slot: TimeSlot) {
  const startMin = timeToMinutes(slot.startTime) - HOUR_START * 60;
  const endMin = timeToMinutes(slot.endTime) - HOUR_START * 60;
  const totalMin = TOTAL_HOURS * 60;
  const top = (startMin / totalMin) * 100;
  const height = Math.max(((endMin - startMin) / totalMin) * 100, 2);
  return { top: `${top}%`, height: `${height}%` };
}

// 색상을 더 진하게 (블록 배경용)
function hexWithAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function WeeklySchedule() {
  const { toast } = useToast();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [timetableId, setTimetableId] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    startTime: '09:00',
    endTime: '10:00',
    color: COLORS[0].value,
  });
  const [isTimetableDialogOpen, setIsTimetableDialogOpen] = useState(false);
  const [timetableFormData, setTimetableFormData] = useState({ name: '' });
  const [isEditingTimetable, setIsEditingTimetable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showTimetableMenu, setShowTimetableMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';



  // 메뉴 외부 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowTimetableMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    fetchTimetables();
  }, []);

  // 현재 시간으로 스크롤 (제거됨)

  const fetchTimetables = async () => {
    try {
      let response = await fetch(`${API_BASE}/api/timetables`, { credentials: 'include' });
      if (response.ok) {
        const data: Timetable[] = await response.json();
        setTimetables(data);
        if (data.length === 0) {
          response = await fetch(`${API_BASE}/api/timetables`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name: '내 시간표' }),
          });
          if (response.ok) {
            const newTimetable: Timetable = await response.json();
            setTimetables([newTimetable]);
            setTimetableId(newTimetable.id);
            setTimeSlots([]);
          }
        } else {
          setTimetableId(data[0].id);
          updateTimeSlots(data[0]);
        }
      }
    } catch {
      toast({ title: '시간표를 불러오지 못했습니다.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const updateTimeSlots = (timetable: Timetable) => {
    setTimeSlots(timetable.items.map((item) => ({
      id: item.id,
      day: DAY_MAP[item.day] || 0,
      startTime: item.startTime,
      endTime: item.endTime,
      title: item.title,
      color: item.color,
    })));
  };

  const handleTimetableChange = (id: string) => {
    setTimetableId(id);
    const selected = timetables.find((t) => t.id === id);
    if (selected) updateTimeSlots(selected);
    setShowTimetableMenu(false);
  };

  const openAddDialog = (day: number, hour?: number) => {
    const startTime = hour !== undefined
      ? `${hour.toString().padStart(2, '0')}:00`
      : '09:00';
    const endHour = hour !== undefined ? Math.min(hour + 1, 23) : 10;
    const endTime = `${endHour.toString().padStart(2, '0')}:00`;
    setEditingSlot({ id: '', day, startTime, endTime, title: '', color: COLORS[0].value });
    setFormData({ title: '', startTime, endTime, color: COLORS[0].value });
    setIsDialogOpen(true);
  };

  const openEditDialog = (slot: TimeSlot) => {
    setEditingSlot(slot);
    setFormData({ title: slot.title, startTime: slot.startTime, endTime: slot.endTime, color: slot.color });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingSlot || !formData.title.trim() || !timetableId) return;
    const payload = {
      title: formData.title,
      day: DAY_NAMES[editingSlot.day],
      startTime: formData.startTime,
      endTime: formData.endTime,
      color: formData.color,
    };
    try {
      const url = editingSlot.id
        ? `${API_BASE}/api/timetables/${timetableId}/items/${editingSlot.id}`
        : `${API_BASE}/api/timetables/${timetableId}/items`;
      const method = editingSlot.id ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        const updated: Timetable = await response.json();
        setTimetables((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        updateTimeSlots(updated);
        toast({ title: editingSlot.id ? '일정이 수정됐습니다' : '일정이 추가됐습니다' });
      }
      setIsDialogOpen(false);
      setEditingSlot(null);
    } catch {
      toast({ title: '저장 실패', variant: 'destructive' });
    }
  };

  const removeTimeSlot = async (id: string) => {
    if (!timetableId) return;
    try {
      const response = await fetch(`${API_BASE}/api/timetables/${timetableId}/items/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        const updated: Timetable = await response.json();
        setTimetables((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        updateTimeSlots(updated);
        toast({ title: '일정이 삭제됐습니다' });
        setIsDialogOpen(false);
      }
    } catch {
      toast({ title: '삭제 실패', variant: 'destructive' });
    }
  };

  const openCreateTimetableDialog = () => {
    setTimetableFormData({ name: '' });
    setIsEditingTimetable(false);
    setIsTimetableDialogOpen(true);
    setShowTimetableMenu(false);
  };

  const openEditTimetableDialog = () => {
    const cur = timetables.find((t) => t.id === timetableId);
    if (cur) {
      setTimetableFormData({ name: cur.name });
      setIsEditingTimetable(true);
      setIsTimetableDialogOpen(true);
      setShowTimetableMenu(false);
    }
  };

  const handleSaveTimetable = async () => {
    if (!timetableFormData.name.trim()) return;
    try {
      const url = isEditingTimetable && timetableId
        ? `${API_BASE}/api/timetables/${timetableId}`
        : `${API_BASE}/api/timetables`;
      const method = isEditingTimetable ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(timetableFormData),
      });
      if (response.ok) {
        const saved: Timetable = await response.json();
        if (isEditingTimetable) {
          setTimetables((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
          toast({ title: '시간표가 수정됐습니다' });
        } else {
          setTimetables((prev) => [...prev, saved]);
          setTimetableId(saved.id);
          updateTimeSlots(saved);
          toast({ title: '새 시간표가 생성됐습니다' });
        }
        setIsTimetableDialogOpen(false);
      }
    } catch {
      toast({ title: '오류가 발생했습니다', variant: 'destructive' });
    }
  };

  const handleDeleteTimetable = async () => {
    if (!timetableId || !confirm('이 시간표를 삭제할까요?')) return;
    try {
      const response = await fetch(`${API_BASE}/api/timetables/${timetableId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        const remaining = timetables.filter((t) => t.id !== timetableId);
        setTimetables(remaining);
        if (remaining.length > 0) {
          setTimetableId(remaining[0].id);
          updateTimeSlots(remaining[0]);
        } else {
          setTimetableId('');
          setTimeSlots([]);
        }
        toast({ title: '시간표가 삭제됐습니다' });
        setShowTimetableMenu(false);
      }
    } catch {
      toast({ title: '삭제 실패', variant: 'destructive' });
    }
  };

  const currentTimetableName = timetables.find((t) => t.id === timetableId)?.name ?? '시간표';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-5 w-5 rounded-full border-2 border-primary border-r-transparent animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* ── 헤더 ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        {/* 시간표 선택 드롭다운 */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowTimetableMenu((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-primary transition-colors"
          >
            {currentTimetableName}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          {showTimetableMenu && (
            <div className="absolute left-0 top-full mt-1 z-50 min-w-[160px] rounded-xl bg-background border border-border shadow-lg overflow-hidden">
              {timetables.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleTimetableChange(t.id)}
                  className={`w-full text-left px-3 py-2.5 text-sm transition-colors hover:bg-accent ${
                    t.id === timetableId ? 'font-semibold text-primary' : 'text-foreground'
                  }`}
                >
                  {t.name}
                </button>
              ))}
              <div className="border-t border-border/50 mt-1">
                <button
                  onClick={openCreateTimetableDialog}
                  className="w-full text-left px-3 py-2.5 text-sm text-primary hover:bg-accent transition-colors flex items-center gap-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  새 시간표
                </button>
                {timetableId && (
                  <>
                    <button
                      onClick={openEditTimetableDialog}
                      className="w-full text-left px-3 py-2.5 text-sm text-foreground hover:bg-accent transition-colors flex items-center gap-2"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      이름 변경
                    </button>
                    <button
                      onClick={handleDeleteTimetable}
                      className="w-full text-left px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      삭제
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <span className="text-xs text-muted-foreground">
          {timeSlots.length}개 일정
        </span>
      </div>

      {/* ── 그리드 ──────────────────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden border border-border/60">
        {/* 요일 헤더 */}
        <div className="grid border-b border-border/60 bg-muted/30" style={{ gridTemplateColumns: '32px repeat(7, 1fr)' }}>
          <div className="py-2" />
          {DAYS.map((day, i) => (
            <div
              key={day}
              className={`py-2 text-center text-xs font-semibold ${
                i === 5 ? 'text-blue-500' : i === 6 ? 'text-red-500' : 'text-foreground'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 시간 그리드 */}
        <div className="relative overflow-hidden">
          <div className="grid" style={{ gridTemplateColumns: '32px repeat(7, 1fr)', height: `${ROW_HEIGHT * TOTAL_HOURS}px` }}>

            {/* 시간 레이블 열 */}
            <div className="relative border-r border-border/40">
              {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                <div
                  key={i}
                  className="absolute w-full flex items-start justify-center pt-0.5"
                  style={{ top: `${(i / TOTAL_HOURS) * 100}%`, height: `${(1 / TOTAL_HOURS) * 100}%` }}
                >
                  <span className="text-[9px] font-medium text-muted-foreground/70 leading-none">
                    {(HOUR_START + i).toString().padStart(2, '0')}
                  </span>
                </div>
              ))}
            </div>

            {/* 요일 열 */}
            {DAYS.map((day, dayIdx) => (
              <div
                key={day}
                className="relative border-r border-border/30 last:border-r-0"
              >
                {/* 시간 구분선 */}
                {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                  <div
                    key={i}
                    className={`absolute w-full border-t ${
                      i === 0 ? 'border-border/0' : i % 6 === 0 ? 'border-border/50' : 'border-border/20'
                    }`}
                    style={{ top: `${(i / TOTAL_HOURS) * 100}%` }}
                  />
                ))}

                {/* 클릭 영역 (시간별) */}
                {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                  <div
                    key={i}
                    className="absolute w-full hover:bg-primary/5 transition-colors cursor-pointer"
                    style={{
                      top: `${(i / TOTAL_HOURS) * 100}%`,
                      height: `${(1 / TOTAL_HOURS) * 100}%`,
                    }}
                    onClick={() => openAddDialog(dayIdx, HOUR_START + i)}
                  />
                ))}

                {/* 일정 블록 */}
                {timeSlots
                  .filter((s) => s.day === dayIdx)
                  .map((slot) => {
                    const style = getSlotStyle(slot);
                    const durationMin =
                      timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime);
                    const isShort = durationMin < 45;
                    return (
                      <div
                        key={slot.id}
                        className="absolute left-0.5 right-0.5 rounded-md cursor-pointer overflow-hidden z-10 transition-all hover:brightness-90 active:scale-[0.98]"
                        style={{
                          ...style,
                          backgroundColor: hexWithAlpha(slot.color, 0.5),
                          borderLeft: `4px solid ${slot.color}`,
                          minHeight: '20px',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(slot);
                        }}
                      >
                        <div className="px-1 pt-0.5 h-full flex flex-col">
                          <p
                            className="text-[10px] font-bold leading-tight truncate"
                            style={{ color: slot.color, filter: 'brightness(0.65)' }}
                          >
                            {slot.title}
                          </p>
                          {!isShort && (
                            <p
                              className="text-[9px] leading-none mt-0.5 font-medium"
                              style={{ color: slot.color, filter: 'brightness(0.7)', opacity: 0.9 }}
                            >
                              {slot.startTime}–{slot.endTime}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>

          {/* 현재 시간 인디케이터 제거 */}
        </div>
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground/60 text-center">
        빈 칸 탭 → 일정 추가 · 일정 탭 → 수정/삭제
      </p>

      {/* ── 일정 추가/수정 다이얼로그 ──────────────────────────── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editingSlot?.id ? '일정 수정' : `${editingSlot !== null ? DAYS[editingSlot.day] + '요일 ' : ''}일정 추가`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* 제목 */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">일정</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="예: 자료구조 수업"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
            </div>

            {/* 시간 */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">시작</Label>
                <TimeWheelPicker
                  value={formData.startTime}
                  onChange={(value) => setFormData({ ...formData, startTime: value })}
                  minTime="06:00"
                  maxTime="23:50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">종료</Label>
                <TimeWheelPicker
                  value={formData.endTime}
                  onChange={(value) => setFormData({ ...formData, endTime: value })}
                  minTime="06:00"
                  maxTime="23:50"
                />
              </div>
            </div>

            {/* 색상 */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">색상</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    title={color.label}
                    className="h-8 w-8 rounded-full transition-all focus:outline-none"
                    style={{
                      backgroundColor: color.value,
                      boxShadow: formData.color === color.value
                        ? `0 0 0 2px white, 0 0 0 4px ${color.value}`
                        : 'none',
                      transform: formData.color === color.value ? 'scale(1.15)' : 'scale(1)',
                    }}
                    onClick={() => setFormData({ ...formData, color: color.value })}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex justify-between gap-2 pt-2">
            {editingSlot?.id ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => removeTimeSlot(editingSlot.id)}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                삭제
              </Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>
                취소
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!formData.title.trim()}>
                저장
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── 시간표 이름 다이얼로그 ──────────────────────────────── */}
      <Dialog open={isTimetableDialogOpen} onOpenChange={setIsTimetableDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">
              {isEditingTimetable ? '시간표 이름 변경' : '새 시간표'}
            </DialogTitle>
          </DialogHeader>
          <div className="pt-1">
            <Label className="text-xs text-muted-foreground mb-1.5 block">이름</Label>
            <Input
              value={timetableFormData.name}
              onChange={(e) => setTimetableFormData({ name: e.target.value })}
              placeholder="예: 1학년 1학기"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveTimetable()}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsTimetableDialogOpen(false)}>
              취소
            </Button>
            <Button size="sm" onClick={handleSaveTimetable} disabled={!timetableFormData.name.trim()}>
              저장
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
