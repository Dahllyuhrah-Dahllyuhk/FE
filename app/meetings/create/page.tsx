'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CalendarIcon, X, Clock, ChevronLeft } from 'lucide-react';

import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TimeRangeSelector } from '@/components/time-range-selector';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { createMeeting, fetchFriends, type FriendDto } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

// 슬롯 배열 → API timeConstraints 변환
function slotsToConstraints(slots: number[]) {
  if (slots.length === 0) return [];
  const sorted = [...slots].sort((a, b) => a - b);
  const ranges: { startTime: string; endTime: string }[] = [];
  let start = sorted[0];
  let end = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    if (i < sorted.length && sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push({
        startTime: `${start.toString().padStart(2, '0')}:00:00`,
        endTime: `${(end + 1).toString().padStart(2, '0')}:00:00`,
      });
      if (i < sorted.length) { start = sorted[i]; end = sorted[i]; }
    }
  }
  return ranges;
}

function formatRangeLabel(slots: number[]) {
  if (slots.length === 0) return '선택 없음';
  const sorted = [...slots].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0]; let end = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    if (i < sorted.length && sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(`${start}:00~${end + 1}:00`);
      if (i < sorted.length) { start = sorted[i]; end = sorted[i]; }
    }
  }
  return ranges.join(', ');
}

export default function CreateMeetingPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isAllDay, setIsAllDay] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<number[]>([9, 10, 11, 12, 13, 14, 15, 16, 17]);
  const [friends, setFriends] = useState<FriendDto[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [reflectTimetable, setReflectTimetable] = useState(true);
  const [reflectCalendar, setReflectCalendar] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    fetchFriends()
      .then(setFriends)
      .catch(() => toast({ title: '친구 목록 로드 실패', variant: 'destructive' }))
      .finally(() => setIsLoadingFriends(false));
  }, []);

  const handleSubmit = async () => {
    if (!name.trim()) { toast({ title: '모임 이름을 입력해주세요.', variant: 'destructive' }); return; }
    if (!dateRange?.from || !dateRange?.to) { toast({ title: '날짜 범위를 선택해주세요.', variant: 'destructive' }); return; }
    if (!isAllDay && selectedSlots.length === 0) { toast({ title: '가능한 시간대를 1개 이상 선택해주세요.', variant: 'destructive' }); return; }

    setIsSubmitting(true);
    try {
      const created = await createMeeting({
        name: name.trim(),
        invitedUserIds: selectedFriends,
        requirement: {
          dateRangeStart: format(dateRange.from, 'yyyy-MM-dd'),
          dateRangeEnd: format(dateRange.to, 'yyyy-MM-dd'),
          isAllDay,
          timeConstraints: isAllDay ? [] : slotsToConstraints(selectedSlots),
        },
        defaultReflectTimetable: reflectTimetable,
        defaultReflectCalendar: reflectCalendar,
      });
      toast({ title: '모임 생성 완료' });
      router.push(`/meetings/${created.id}`);
    } catch {
      toast({ title: '모임 생성 실패', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFriend = (id: string) => {
    setSelectedFriends(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-background">
        <header className="border-b border-border bg-card px-4 py-3 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-base font-bold">새 모임 만들기</h1>
          </div>
        </header>

        <main className="flex-1 p-4 pb-28 max-w-lg mx-auto w-full space-y-5">

          {/* 모임 이름 */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">모임 이름</Label>
            <Input
              placeholder="예: 주간 회의, 저녁 식사"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {/* 날짜 범위 */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">후보 날짜 범위</Label>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full justify-start text-left font-normal', !dateRange && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to
                      ? `${format(dateRange.from, 'PPP', { locale: ko })} – ${format(dateRange.to, 'PPP', { locale: ko })}`
                      : format(dateRange.from, 'PPP', { locale: ko })
                  ) : '날짜를 선택하세요'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  disabled={date => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  locale={ko}
                />
                <div className="border-t border-border p-2">
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => setDatePickerOpen(false)}
                  >
                    완료
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* 하루 종일 토글 */}
          <div className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3">
            <div>
              <p className="text-sm font-medium">하루 종일</p>
              <p className="text-xs text-muted-foreground">시간 제약 없이 날짜만 정합니다</p>
            </div>
            <Switch checked={isAllDay} onCheckedChange={setIsAllDay} />
          </div>

          {/* 시간대 선택 */}
          {!isAllDay && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">가능한 시간대</Label>
                <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => setShowTimePicker(v => !v)}>
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  {showTimePicker ? '접기' : '편집'}
                </Button>
              </div>

              {/* 선택된 시간 요약 */}
              <div className="rounded-xl border border-border/60 px-4 py-3 bg-muted/20">
                <p className="text-xs text-muted-foreground mb-1">선택된 시간대</p>
                <p className="text-sm font-medium text-foreground">
                  {formatRangeLabel(selectedSlots)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  총 {selectedSlots.length}시간 선택됨
                </p>
              </div>

              {showTimePicker && (
                <div className="rounded-xl border border-border/60 p-4 bg-card">
                  <p className="text-xs text-muted-foreground mb-3">
                    클릭 또는 드래그로 가능한 시간대를 선택하세요. 여러 구간을 자유롭게 선택할 수 있어요.
                  </p>
                  <TimeRangeSelector
                    selectedSlots={selectedSlots}
                    onSlotsChange={setSelectedSlots}
                  />
                </div>
              )}
            </div>
          )}

          {/* 친구 초대 (선택) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">친구 초대 (선택)</Label>
              <span className="text-xs text-muted-foreground">모임 코드로도 초대 가능</span>
            </div>
            {isLoadingFriends ? (
              <p className="text-sm text-muted-foreground">로딩 중...</p>
            ) : friends.length === 0 ? (
              <div className="rounded-xl border border-border/60 px-4 py-3 text-sm text-muted-foreground">
                친구가 없어요. 모임 생성 후 코드로 초대할 수 있어요.
              </div>
            ) : (
              <ScrollArea className="h-[180px] rounded-xl border border-border/60">
                <div className="p-3 space-y-1">
                  {friends.map(friend => (
                    <div
                      key={friend.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent cursor-pointer"
                      onClick={() => toggleFriend(friend.id)}
                    >
                      <Checkbox
                        checked={selectedFriends.includes(friend.id)}
                        onCheckedChange={() => toggleFriend(friend.id)}
                      />
                      <Avatar className="h-7 w-7 flex-shrink-0">
                        <AvatarImage src={friend.profileImageUrl ?? undefined} alt={friend.nickname} />
                        <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                          {friend.nickname?.[0] ?? '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{friend.nickname}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* 일정 반영 설정 */}
          <div className="rounded-xl border border-border/60 p-4 space-y-3">
            <p className="text-sm font-medium">내 일정 반영</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">시간표 반영</p>
                <p className="text-xs text-muted-foreground">수업 시간을 자동으로 불가로 설정</p>
              </div>
              <Switch checked={reflectTimetable} onCheckedChange={setReflectTimetable} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">캘린더 반영</p>
                <p className="text-xs text-muted-foreground">캘린더 일정을 자동으로 불가로 설정</p>
              </div>
              <Switch checked={reflectCalendar} onCheckedChange={setReflectCalendar} />
            </div>
          </div>
        </main>

        {/* 하단 버튼 */}
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background p-4 z-30">
          <Button className="w-full" size="lg" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? '생성 중...' : '모임 만들기'}
          </Button>
        </div>
      </div>
    </ProtectedRoute>
  );
}
