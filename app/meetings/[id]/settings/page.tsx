'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [timeConstraints, setTimeConstraints] = useState<
    { startTime: string; endTime: string }[]
  >([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [friends, setFriends] = useState<FriendDto[]>([]);

  // Participant settings (including host)
  const [reflectTimetable, setReflectTimetable] = useState(false);
  const [reflectCalendar, setReflectCalendar] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [meetingData, friendsData] = await Promise.all([
          fetchMeeting(id),
          fetchFriends(),
        ]);

        setMeeting(meetingData);

        setName(meetingData.name);
        setDateRangeStart(
          format(new Date(meetingData.requirement.dateRangeStart), 'yyyy-MM-dd')
        );
        setDateRangeEnd(
          format(new Date(meetingData.requirement.dateRangeEnd), 'yyyy-MM-dd')
        );
        setIsAllDay(meetingData.requirement.isAllDay);

        const parsedConstraints =
          meetingData.requirement.timeConstraints &&
          meetingData.requirement.timeConstraints.length > 0
            ? meetingData.requirement.timeConstraints.map((constraint) => ({
                startTime: constraint.startTime.substring(0, 5), // "09:00:00" -> "09:00"
                endTime: constraint.endTime.substring(0, 5), // "18:00:00" -> "18:00"
              }))
            : [{ startTime: '09:00', endTime: '18:00' }];

        setTimeConstraints(parsedConstraints);

        setSelectedFriends(
          meetingData.participants
            ?.filter((p) => p.userId !== meetingData.hostUserId)
            .map((p) => p.userId) || []
        );
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
        toast({
          title: '로드 실패',
          description: '모임 정보를 불러오는데 실패했습니다.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [id, router, user]);

  const handleSave = async () => {
    if (!meeting || !user) return;

    setIsSaving(true);

    try {
      // 개인 설정 업데이트
      console.log('[v0] Updating participant settings:', {
        reflectTimetable,
        reflectCalendar,
      });
      await updateParticipantSettings(meeting.id, {
        reflectTimetable,
        reflectCalendar,
      });

      if (meeting.hostUserId === user.id) {
        if (!name.trim()) {
          toast({
            title: '입력 오류',
            description: '모임 이름을 입력해주세요.',
            variant: 'destructive',
          });
          setIsSaving(false);
          return;
        }
        if (!dateRangeStart || !dateRangeEnd) {
          toast({
            title: '입력 오류',
            description: '날짜 범위를 선택해주세요.',
            variant: 'destructive',
          });
          setIsSaving(false);
          return;
        }

        const constraintsWithSeconds = timeConstraints.map((constraint) => ({
          startTime: `${constraint.startTime}:00`,
          endTime: `${constraint.endTime}:00`,
        }));

        const requirementPayload = {
          dateRangeStart,
          dateRangeEnd,
          isAllDay,
          timeConstraints: isAllDay ? [] : constraintsWithSeconds,
        };

        console.log(
          '[v0] Updating meeting with requirement:',
          requirementPayload
        );

        const updateRequest: MeetingUpdateRequest = {
          name: name.trim(),
          invitedUserIds: selectedFriends,
          requirement: requirementPayload,
        };

        await updateMeeting(meeting.id, updateRequest);
      }

      toast({
        title: '설정 저장됨',
        description: '모임 설정이 성공적으로 저장되었습니다.',
      });

      router.back();
    } catch (error) {
      console.error('Failed to save settings', error);
      toast({
        title: '저장 실패',
        description: '설정을 저장하는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const addTimeConstraint = () => {
    setTimeConstraints([
      ...timeConstraints,
      { startTime: '09:00', endTime: '18:00' },
    ]);
  };

  const removeTimeConstraint = (index: number) => {
    if (timeConstraints.length > 1) {
      setTimeConstraints(timeConstraints.filter((_, i) => i !== index));
    }
  };

  const updateTimeConstraint = (
    index: number,
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    const updated = [...timeConstraints];
    updated[index][field] = value;
    setTimeConstraints(updated);
  };

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      const time = `${hour.toString().padStart(2, '0')}:00`;
      options.push(time);
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

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
            {/* Participant Settings (For all users including host) */}
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
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    내 주간 시간표를 모임 일정에 반영합니다
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="calendar">캘린더 일정 반영</Label>
                    <Switch
                      id="calendar"
                      checked={reflectCalendar}
                      onCheckedChange={setReflectCalendar}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    내 캘린더 일정을 모임 일정에 반영합니다
                  </p>
                </div>
              </div>
            </Card>

            {/* Host-only Settings */}
            {isHost && (
              <>
                <Separator />
                <Card className="p-6">
                  <h2 className="text-lg font-semibold mb-4">
                    모임 관리 (생성자 전용)
                  </h2>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">모임 이름</Label>
                      <Input
                        id="name"
                        placeholder="모임 이름을 입력하세요"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>후보 날짜 범위</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label
                            htmlFor="start"
                            className="text-xs text-muted-foreground"
                          >
                            시작일
                          </Label>
                          <Input
                            id="start"
                            type="date"
                            value={dateRangeStart}
                            onChange={(e) => setDateRangeStart(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label
                            htmlFor="end"
                            className="text-xs text-muted-foreground"
                          >
                            종료일
                          </Label>
                          <Input
                            id="end"
                            type="date"
                            value={dateRangeEnd}
                            onChange={(e) => setDateRangeEnd(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="allday">하루 종일</Label>
                        <Switch
                          id="allday"
                          checked={isAllDay}
                          onCheckedChange={setIsAllDay}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        특정 시간대가 아닌 하루 전체를 선택합니다
                      </p>
                    </div>

                    {!isAllDay && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-base">시간 제약</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addTimeConstraint}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            시간 추가
                          </Button>
                        </div>
                        {timeConstraints.map((constraint, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/30"
                          >
                            <div className="flex-1 grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">
                                  시작 시간
                                </Label>
                                <Select
                                  value={constraint.startTime}
                                  onValueChange={(value) =>
                                    updateTimeConstraint(
                                      index,
                                      'startTime',
                                      value
                                    )
                                  }
                                >
                                  <SelectTrigger className="h-11">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {timeOptions.map((time) => (
                                      <SelectItem key={time} value={time}>
                                        {time}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">
                                  종료 시간
                                </Label>
                                <Select
                                  value={constraint.endTime}
                                  onValueChange={(value) =>
                                    updateTimeConstraint(
                                      index,
                                      'endTime',
                                      value
                                    )
                                  }
                                >
                                  <SelectTrigger className="h-11">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {timeOptions.map((time) => (
                                      <SelectItem key={time} value={time}>
                                        {time}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeTimeConstraint(index)}
                              disabled={timeConstraints.length === 1}
                              className="shrink-0 mt-6"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <p className="text-xs text-muted-foreground">
                          모임이 가능한 시간대를 설정하세요. (예: 10:00 ~ 12:00)
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>참여자 관리</Label>
                      <div className="rounded-lg border border-border p-4 max-h-64 overflow-y-auto">
                        {friends.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            친구가 없습니다
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {friends.map((friend) => {
                              if (friend.id === meeting.hostUserId) return null;

                              const isCurrentlyInvited =
                                selectedFriends.includes(friend.id);

                              return (
                                <div
                                  key={friend.id}
                                  className="flex items-center gap-3 p-2 hover:bg-accent rounded-md transition-colors"
                                >
                                  <Checkbox
                                    id={`friend-${friend.id}`}
                                    checked={isCurrentlyInvited}
                                    onCheckedChange={() =>
                                      toggleFriend(friend.id)
                                    }
                                  />
                                  <Label
                                    htmlFor={`friend-${friend.id}`}
                                    className="flex items-center gap-2 flex-1 cursor-pointer"
                                  >
                                    {friend.profileImageUrl && (
                                      <img
                                        src={
                                          friend.profileImageUrl ||
                                          '/placeholder.svg'
                                        }
                                        alt={friend.nickname}
                                        className="w-8 h-8 rounded-full object-cover"
                                      />
                                    )}
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        {friend.nickname}
                                      </span>
                                      {isCurrentlyInvited && (
                                        <span className="text-xs text-muted-foreground">
                                          참여 중/초대됨
                                        </span>
                                      )}
                                    </div>
                                  </Label>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {1 + selectedFriends.length}명 참여자 (호스트 포함)
                      </p>
                    </div>
                  </div>
                </Card>
              </>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? '저장 중...' : '저장'}
              </Button>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
