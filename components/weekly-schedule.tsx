'use client';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Plus, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { TimeWheelPicker } from '@/components/time-wheel-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
const HOUR_BLOCKS = Array.from({ length: 18 }, (_, i) => {
  const start = 6 + i;
  return { start, end: start + 1, label: start.toString().padStart(2, '0') };
});

const COLORS = [
  { value: '#FFB3BA', label: '연분홍' },
  { value: '#FFDFBA', label: '복숭아' },
  { value: '#FFFFBA', label: '레몬' },
  { value: '#BAFFC9', label: '민트' },
  { value: '#BAE1FF', label: '하늘' },
  { value: '#C9B3FF', label: '라벤더' },
  { value: '#FFB3E6', label: '핑크' },
  { value: '#B3E5FF', label: '아쿠아' },
];

const DAY_MAP: { [key: string]: number } = {
  MONDAY: 0,
  TUESDAY: 1,
  WEDNESDAY: 2,
  THURSDAY: 3,
  FRIDAY: 4,
  SATURDAY: 5,
  SUNDAY: 6,
};

const DAY_NAMES = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

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

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

  useEffect(() => {
    fetchTimetables();
  }, []);

  const fetchTimetables = async () => {
    try {
      let response = await fetch(`${API_BASE}/api/timetables`, {
        credentials: 'include',
      });

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
          const initialTimetable = data[0];
          setTimetableId(initialTimetable.id);
          updateTimeSlots(initialTimetable);
        }
      }
    } catch (error) {
      console.error('Failed to fetch timetables:', error);
      toast({ title: '시간표를 불러오지 못했습니다.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const updateTimeSlots = (timetable: Timetable) => {
    const slots: TimeSlot[] = timetable.items.map((item) => ({
      id: item.id,
      day: DAY_MAP[item.day] || 0,
      startTime: item.startTime,
      endTime: item.endTime,
      title: item.title,
      color: item.color,
    }));
    setTimeSlots(slots);
  };

  const handleTimetableChange = (id: string) => {
    setTimetableId(id);
    const selected = timetables.find((t) => t.id === id);
    if (selected) {
      updateTimeSlots(selected);
    }
  };

  const openAddDialog = (day: number, time?: string) => {
    setEditingSlot({
      id: '',
      day,
      startTime: time || '09:00',
      endTime: time ? addHour(time) : '10:00',
      title: '',
      color: COLORS[0].value,
    });
    setFormData({
      title: '',
      startTime: time || '09:00',
      endTime: time ? addHour(time) : '10:00',
      color: COLORS[0].value,
    });
    setIsDialogOpen(true);
  };

  const addHour = (time: string) => {
    const [hour, min] = time.split(':').map(Number);
    const newHour = (hour + 1) % 24;
    return `${newHour.toString().padStart(2, '0')}:${min
      .toString()
      .padStart(2, '0')}`;
  };

  const openEditDialog = (slot: TimeSlot) => {
    setEditingSlot(slot);
    setFormData({
      title: slot.title,
      startTime: slot.startTime,
      endTime: slot.endTime,
      color: slot.color,
    });
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
      let response;
      if (editingSlot.id) {
        response = await fetch(
          `${API_BASE}/api/timetables/${timetableId}/items/${editingSlot.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload),
          }
        );
      } else {
        response = await fetch(
          `${API_BASE}/api/timetables/${timetableId}/items`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload),
          }
        );
      }

      if (response.ok) {
        const updatedTimetable: Timetable = await response.json();
        setTimetables((prev) =>
          prev.map((t) => (t.id === updatedTimetable.id ? updatedTimetable : t))
        );
        updateTimeSlots(updatedTimetable);
        toast({
          title: editingSlot.id
            ? '일정이 수정되었습니다'
            : '일정이 추가되었습니다',
        });
      }
      setIsDialogOpen(false);
      setEditingSlot(null);
    } catch (error) {
      console.error('Failed to save time slot:', error);
      toast({ title: '시간표 저장에 실패했습니다.', variant: 'destructive' });
      toast({
        title: '오류가 발생했습니다',
        description: '다시 시도해주세요',
        variant: 'destructive',
      });
    }
  };

  const removeTimeSlot = async (id: string) => {
    if (!timetableId) return;

    try {
      const response = await fetch(
        `${API_BASE}/api/timetables/${timetableId}/items/${id}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      if (response.ok) {
        const updatedTimetable: Timetable = await response.json();
        setTimetables((prev) =>
          prev.map((t) => (t.id === updatedTimetable.id ? updatedTimetable : t))
        );
        updateTimeSlots(updatedTimetable);
        toast({ title: '일정이 삭제되었습니다' });
        setIsDialogOpen(false);
      }
    } catch (error) {
      console.error('Failed to delete time slot:', error);
      toast({
        title: '삭제 실패',
        description: '다시 시도해주세요',
        variant: 'destructive',
      });
    }
  };

  const getSlotPosition = (slot: TimeSlot) => {
    const [startHour, startMin] = slot.startTime.split(':').map(Number);
    const [endHour, endMin] = slot.endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin - 6 * 60; // 6시 기준
    const endMinutes = endHour * 60 + endMin - 6 * 60;
    const totalMinutes = 18 * 60; // 6시~24시 = 18시간

    const top = (startMinutes / totalMinutes) * 100;
    const height = ((endMinutes - startMinutes) / totalMinutes) * 100;

    return { top: `${Math.max(0, top)}%`, height: `${Math.max(0, height)}%` };
  };

  const openCreateTimetableDialog = () => {
    setTimetableFormData({ name: '' });
    setIsEditingTimetable(false);
    setIsTimetableDialogOpen(true);
  };

  const openEditTimetableDialog = () => {
    const currentTimetable = timetables.find((t) => t.id === timetableId);
    if (currentTimetable) {
      setTimetableFormData({ name: currentTimetable.name });
      setIsEditingTimetable(true);
      setIsTimetableDialogOpen(true);
    }
  };

  const handleSaveTimetable = async () => {
    if (!timetableFormData.name.trim()) return;

    try {
      let response;
      if (isEditingTimetable && timetableId) {
        response = await fetch(`${API_BASE}/api/timetables/${timetableId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(timetableFormData),
        });
      } else {
        response = await fetch(`${API_BASE}/api/timetables`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(timetableFormData),
        });
      }

      if (response.ok) {
        const savedTimetable: Timetable = await response.json();
        if (isEditingTimetable) {
          setTimetables((prev) =>
            prev.map((t) => (t.id === savedTimetable.id ? savedTimetable : t))
          );
          toast({ title: '시간표가 수정되었습니다' });
        } else {
          setTimetables((prev) => [...prev, savedTimetable]);
          setTimetableId(savedTimetable.id);
          updateTimeSlots(savedTimetable);
          toast({ title: '새 시간표가 생성되었습니다' });
        }
        setIsTimetableDialogOpen(false);
      }
    } catch (error) {
      console.error('Failed to save timetable:', error);
      toast({
        title: '오류가 발생했습니다',
        description: '다시 시도해주세요',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTimetable = async () => {
    if (!timetableId || !confirm('정말 이 시간표를 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(
        `${API_BASE}/api/timetables/${timetableId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      if (response.ok) {
        const remainingTimetables = timetables.filter(
          (t) => t.id !== timetableId
        );
        setTimetables(remainingTimetables);

        if (remainingTimetables.length > 0) {
          setTimetableId(remainingTimetables[0].id);
          updateTimeSlots(remainingTimetables[0]);
        } else {
          setTimetableId('');
          setTimeSlots([]);
        }
        toast({ title: '시간표가 삭제되었습니다' });
      }
    } catch (error) {
      console.error('Failed to delete timetable:', error);
      toast({
        title: '삭제 실패',
        description: '다시 시도해주세요',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-4">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">
              주간 시간표
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <Select value={timetableId} onValueChange={handleTimetableChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="시간표 선택" />
              </SelectTrigger>
              <SelectContent>
                {timetables.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={openCreateTimetableDialog}
                title="새 시간표 만들기"
              >
                <Plus className="h-4 w-4" />
              </Button>
              {timetableId && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={openEditTimetableDialog}
                    title="시간표 수정"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDeleteTimetable}
                    title="시간표 삭제"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>

            <Badge variant="secondary" className="ml-2">
              {timeSlots.length}개 일정
            </Badge>
          </div>
        </div>

        <div className="w-full">
          <div className="grid grid-cols-8 gap-0 border-t border-l border-border">
            <div className="border-r border-b border-border bg-muted/30 p-1 sm:p-2">
              <div className="text-center text-[10px] sm:text-xs font-medium text-muted-foreground">
                시간
              </div>
            </div>
            {DAYS.map((day) => (
              <div
                key={day}
                className="border-r border-b border-border bg-muted/30 p-1 sm:p-2"
              >
                <div className="text-center text-[11px] sm:text-sm font-semibold text-foreground">
                  {day}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-8 gap-0">
            <div className="border-l border-border">
              {HOUR_BLOCKS.map((block) => (
                <div
                  key={block.start}
                  className="border-r border-b border-border bg-muted/20 p-0.5 sm:p-1 h-10 sm:h-12 flex items-center justify-center last:border-b"
                >
                  <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                    {block.label}
                  </span>
                </div>
              ))}
            </div>

            {DAYS.map((day, dayIdx) => (
              <div key={day} className="relative border-r border-border">
                {HOUR_BLOCKS.map((block) => (
                  <div
                    key={block.start}
                    className="h-10 sm:h-12 border-b border-border bg-card hover:bg-accent/20 cursor-pointer transition-colors last:border-b"
                    onClick={() =>
                      openAddDialog(
                        dayIdx,
                        `${block.start.toString().padStart(2, '0')}:00`
                      )
                    }
                  />
                ))}

                {timeSlots
                  .filter((slot) => slot.day === dayIdx)
                  .map((slot) => {
                    const { top, height } = getSlotPosition(slot);
                    return (
                      <div
                        key={slot.id}
                        className="absolute left-0 right-0 mx-0.5 rounded-md cursor-pointer hover:shadow-lg transition-all group z-10 overflow-hidden border border-black/5"
                        style={{
                          top,
                          height,
                          backgroundColor: slot.color,
                          minHeight: '24px',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(slot);
                        }}
                      >
                        <div className="p-1 h-full flex flex-col justify-start items-start relative">
                          <div className="text-[10px] sm:text-xs font-bold text-gray-900 leading-tight truncate w-full text-left">
                            {slot.title}
                          </div>
                          <div className="text-[8px] sm:text-[9px] text-gray-600 mt-0.5 hidden sm:block w-full text-left">
                            {slot.startTime}-{slot.endTime}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">
            빈 칸을 클릭하여 일정을 추가하고, 일정을 클릭하여 수정하거나 삭제할
            수 있습니다.
          </p>
        </div>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSlot?.id ? '일정 수정' : '일정 추가'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">수업명</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="예: 자료구조"
                autoFocus
              />
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>시작 시간</Label>
                <TimeWheelPicker
                  value={formData.startTime}
                  onChange={(value) =>
                    setFormData({ ...formData, startTime: value })
                  }
                  minTime="06:00"
                  maxTime="23:50"
                />
              </div>
              <div className="space-y-2">
                <Label>종료 시간</Label>
                <TimeWheelPicker
                  value={formData.endTime}
                  onChange={(value) =>
                    setFormData({ ...formData, endTime: value })
                  }
                  minTime="06:00"
                  maxTime="23:50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">색상</Label>
              <div className="grid grid-cols-4 gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`h-10 rounded border-2 transition-all hover:scale-110 ${
                      formData.color === color.value
                        ? 'border-primary ring-2 ring-primary ring-offset-2'
                        : 'border-border'
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() =>
                      setFormData({ ...formData, color: color.value })
                    }
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-between gap-2">
            {editingSlot?.id ? (
              <Button
                variant="destructive"
                onClick={() => removeTimeSlot(editingSlot.id)}
                type="button"
              >
                삭제
              </Button>
            ) : (
              <div></div> // Spacer to keep Save/Cancel on the right
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleSave} disabled={!formData.title.trim()}>
                저장
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isTimetableDialogOpen}
        onOpenChange={setIsTimetableDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditingTimetable ? '시간표 수정' : '새 시간표 만들기'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="timetable-name">시간표 이름</Label>
              <Input
                id="timetable-name"
                value={timetableFormData.name}
                onChange={(e) =>
                  setTimetableFormData({
                    ...timetableFormData,
                    name: e.target.value,
                  })
                }
                placeholder="예: 1학년 1학기"
                autoFocus
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsTimetableDialogOpen(false)}
            >
              취소
            </Button>
            <Button
              onClick={handleSaveTimetable}
              disabled={!timetableFormData.name.trim()}
            >
              저장
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
