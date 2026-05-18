'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Lock } from 'lucide-react';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/ui/date-picker';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import {
  fetchMeeting,
  updateMeeting,
  fetchFriends,
  updateParticipantSettings,
  type FriendDto,
} from '@/lib/api';
import type { Meeting, MeetingUpdateRequest } from '@/types/meeting';
import { Separator } from '@/components/ui/separator';
import { TimeRangeSelector } from '@/components/time-range-selector';

export default function MeetingSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const { user } = useAuth();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Host-only settings
  const [name, setName] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isAllDay, setIsAllDay] = useState(false);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<number[]>([]);
  const [friends, setFriends] = useState<FriendDto[]>([]);

  // Participant settings (including host)
  const [reflectTimetable, setReflectTimetable] = useState(false);
  const [reflectCalendar, setReflectCalendar] = useState(false);

  const timeConstraintsToSlots = (
    constraints: { startTime: string; endTime: string }[]
  ): number[] => {
    const slots: number[] = [];
    constraints.forEach((constraint) => {
      const [startHour] = constraint.startTime.split(':').map(Number);
      const [endHour] = constraint.endTime.split(':').map(Number);
      for (let i = startHour; i < endHour; i++) {
        if (!slots.includes(i)) slots.push(i);
      }
    });
    return slots.sort((a, b) => a - b);
  };

  const slotsToTimeConstraints = (slots: number[]) => {
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
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return '조율 중';
      case 'CONFIRMED': return '확정됨';
      case 'CLOSED': return '종료됨';
      default: return status;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [meetingData, friendsData] = await Promise.all([
          fetchMeeting(id),
          fetchFriends(),
        ]);

        setMeeting(meetingData);
        setName(meetingData.name);

        const from = new Date(meetingData.requirement.dateRangeStart);
        const to = new Date(meetingData.requirement.dateRangeEnd);
        setDateRange({ from, to });
        setIsAllDay(meetingData.requirement.isAllDay);

        if (meetingData.requirement.timeConstraints?.length > 0) {
          const parsed = meetingData.requirement.timeConstraints.map((c) => ({
            startTime: c.startTime.substring(0, 5),
            endTime: c.endTime.substring(0, 5),
          }));
          setSelectedTimeSlots(timeConstraintsToSlots(parsed));
        } else {
          setSelectedTimeSlots([9, 10, 11, 12, 13, 14, 15, 16, 17]);
        }

        setFriends(friendsData);

        const currentParticipant = meetingData.participants?.find(
          (p) => p.userId === user?.id
        );
        if (currentParticipant) {
          setReflectTimetable(currentParticipant.reflectTimetable);
          setReflectCalendar(currentParticipant.reflectCalendar);
        } else {
          throw new Error('User not a participant.');
        }
      } catch (error) {
        console.error('Failed to load meeting', error);
        toast({ title: '모임 정보를 불러오지 못했습니다.', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [id, user]);

  const handleSave = async () => {
    if (!meeting || !user) return;

    if (meeting.status !== 'PENDING') {
      toast({
        title: '저장 불가',
        description: '조율 중 상태에서만 설정을 변경할 수 있습니다.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await updateParticipantSettings(meeting.id, { reflectTimetable, reflectCalendar });

      if (meeting.hostUserId === user.id) {
        if (!name.trim()) {
          toast({ title: '입력 오류', description: '모임 이름을 입력해주세요.', variant: 'destructive' });
          setIsSaving(false);
          return;
        }
        if (!dateRange?.from || !dateRange?.to) {
          toast({ title: '입력 오류', description: '날짜 범위를 선택해주세요.', variant: 'destructive' });
          setIsSaving(false);
          return;
        }

        const timeConstraints = isAllDay ? [] : slotsToTimeConstraints(selectedTimeSlots);
        const updateRequest: MeetingUpdateRequest = {
          name: name.trim(),
          invitedUserIds: meeting.participants
            ?.filter((p) => p.userId !== meeting.hostUserId)
            .map((p) => p.userId) || [],
          requirement: {
            dateRangeStart: format(dateRange.from, 'yyyy-MM-dd'),
            dateRangeEnd: format(dateRange.to, 'yyyy-MM-dd'),
            isAllDay,
            timeConstraints,
          },
        };
        await updateMeeting(meeting.id, updateRequest);
      }

      toast({ title: '설정 저장됨', description: '모임 설정이 성공적으로 저장되었습니다.' });
      router.back();
    } catch (error) {
      console.error('Failed to save settings', error);
      toast({ title: '설정 저장에 실패했습니다.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
          <p className="text-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <p className="mb-4 text-muted-foreground">모임을 찾을 수 없습니다.</p>
        <Button onClick={() => router.back()}>돌아가기</Button>
      </div>
    );
  }

  const isHost = meeting.hostUserId === user?.id;
  const isEditable = meeting.status === 'PENDING';

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-background">
        <header className="border-b border-border bg-card px-4 py-4 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">모임 설정</h1>
          </div>
        </header>

        <main className="flex-1 p-4 pb-32 overflow-y-auto">
          <div className="max-w-2xl mx-auto space-y-6">

            {!isEditable && (
              <Card className="p-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900 dark:text-amber-100">설정 변경 불가</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      모임이 {getStatusText(meeting.status)} 상태입니다.
                      {isHost
                        ? ' 상세 페이지에서 조율 중으로 변경하면 설정을 수정할 수 있습니다.'
                        : ' 관리자가 조율 중으로 변경하면 설정을 수정할 수 있습니다.'}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* 내 일정 반영 설정 (모든 참여자) */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">내 일정 반영 설정</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="timetable">주간 시간표 반영</Label>
                    <Switch
                      id="timetable"
                      checked={reflectTimetable}
                      onCheckedChange={setReflectTimetable}
                      disabled={!isEditable}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">내 주간 시간표를 모임 일정에 반영합니다</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="calendar">캘린더 일정 반영</Label>
                    <Switch
                      id="calendar"
                      checked={reflectCalendar}
                      onCheckedChange={setReflectCalendar}
                      disabled={!isEditable}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">내 캘린더 일정을 모임 일정에 반영합니다</p>
                </div>
              </div>
            </Card>

            {/* 호스트 전용: 모임 기본 정보 수정 */}
            {isHost && (
              <>
                <Separator />
                <Card className="p-6">
                  <h2 className="text-lg font-semibold mb-4">모임 기본 설정 (생성자 전용)</h2>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">모임 이름</Label>
                      <Input
                        id="name"
                        placeholder="모임 이름을 입력하세요"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={!isEditable}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>후보 날짜 범위</Label>
                      <DateRangePicker
                        value={dateRange}
                        onChange={setDateRange}
                        disabled={!isEditable}
                        minDate={new Date(new Date().setHours(0, 0, 0, 0))}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="allday">하루 종일</Label>
                        <Switch
                          id="allday"
                          checked={isAllDay}
                          onCheckedChange={setIsAllDay}
                          disabled={!isEditable}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">특정 시간대가 아닌 하루 전체를 선택합니다</p>
                    </div>

                    {!isAllDay && (
                      <div className="space-y-4">
                        <Label className="text-base">시간 제약</Label>
                        <p className="text-xs text-muted-foreground">
                          드래그하여 모임이 가능한 시간대를 설정하세요.
                        </p>
                        <div className="p-4 rounded-lg border border-border bg-muted/30">
                          <div className="max-h-[400px] overflow-y-auto">
                            <TimeRangeSelector
                              selectedSlots={selectedTimeSlots}
                              onSlotsChange={isEditable ? setSelectedTimeSlots : () => {}}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>참여자</Label>
                      <div className="rounded-lg border border-border p-4 max-h-64 overflow-y-auto">
                        {!meeting.participants?.length ? (
                          <p className="text-sm text-muted-foreground text-center py-4">참여자가 없습니다</p>
                        ) : (
                          <div className="space-y-2">
                            {meeting.participants.map((participant) => {
                              const isCurrentUser = participant.userId === user?.id;
                              const isFriend = friends.some((f) => f.id === participant.userId);
                              const isParticipantHost = participant.userId === meeting.hostUserId;
                              return (
                                <div key={participant.userId} className="flex items-center gap-3 p-2 rounded-md bg-accent/30">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm flex-shrink-0">
                                    {participant.name?.[0] ?? '?'}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-sm font-medium text-foreground truncate">{participant.name}</span>
                                      {isParticipantHost && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">호스트</span>
                                      )}
                                      {isCurrentUser && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">나</span>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {participant.status === 'ACCEPTED' ? '참여 확정' : '응답 대기'}
                                    </p>
                                  </div>
                                  {!isCurrentUser && !isFriend && !isParticipantHost && (
                                    <button
                                      onClick={() => router.push('/friends')}
                                      className="text-xs text-primary hover:underline flex-shrink-0 px-2 py-1 rounded-md hover:bg-primary/5 transition-colors"
                                    >
                                      친구 추가
                                    </button>
                                  )}
                                  {!isCurrentUser && isFriend && (
                                    <span className="text-[10px] text-muted-foreground flex-shrink-0">친구</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {meeting.participants?.length ?? 0}명 참여 중 · 새 참여자 초대는 상세 페이지의 모임 초대 코드를 사용하세요
                      </p>
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>
        </main>

        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background p-4 z-10">
          <Button
            onClick={handleSave}
            className="w-full"
            size="lg"
            disabled={isSaving || !isEditable}
          >
            {!isEditable ? (
              <><Lock className="mr-2 h-4 w-4" />설정 변경 불가</>
            ) : isSaving ? (
              '저장 중...'
            ) : (
              '설정 저장'
            )}
          </Button>
        </div>
      </div>
    </ProtectedRoute>
  );
}
