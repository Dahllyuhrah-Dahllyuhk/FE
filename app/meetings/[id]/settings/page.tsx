'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
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

        const requirementPayload = {
          dateRangeStart,
          dateRangeEnd,
          isAllDay,
          timeConstraints: meeting.requirement.timeConstraints || [],
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="timetable" className="flex flex-col gap-1">
                    <span>주간 시간표 반영</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      내 주간 시간표를 모임 일정에 반영합니다
                    </span>
                  </Label>
                  <Switch
                    id="timetable"
                    checked={reflectTimetable}
                    onCheckedChange={setReflectTimetable}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="calendar" className="flex flex-col gap-1">
                    <span>캘린더 일정 반영</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      내 캘린더 일정을 모임 일정에 반영합니다
                    </span>
                  </Label>
                  <Switch
                    id="calendar"
                    checked={reflectCalendar}
                    onCheckedChange={setReflectCalendar}
                  />
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

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="allday" className="flex flex-col gap-1">
                          <span>하루 종일</span>
                          <span className="text-xs text-muted-foreground font-normal">
                            특정 시간대가 아닌 하루 전체를 선택합니다
                          </span>
                        </Label>
                        <Switch
                          id="allday"
                          checked={isAllDay}
                          onCheckedChange={setIsAllDay}
                        />
                      </div>
                    </div>

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
                                          '/placeholder.svg' ||
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
                        {/* 호스트 + 선택된 친구 수 */}
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
