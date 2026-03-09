'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { DatePicker, DateRangePicker } from '@/components/ui/date-picker';
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
  updateMeetingState,
  type FriendDto,
} from '@/lib/api';
import type {
  Meeting,
  MeetingUpdateRequest,
  MeetingStatus,
} from '@/types/meeting';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { TimeRangeSelector } from '@/components/time-range-selector';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
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
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [confirmedDateObj, setConfirmedDateObj] = useState<Date | undefined>();
  const [isAllDay, setIsAllDay] = useState(false);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<number[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [friends, setFriends] = useState<FriendDto[]>([]);

  // Participant settings (including host)
  const [reflectTimetable, setReflectTimetable] = useState(false);
  const [reflectCalendar, setReflectCalendar] = useState(false);

  const [meetingStatus, setMeetingStatus] = useState<MeetingStatus>('PENDING');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPendingDialog, setShowPendingDialog] = useState(false);
  const [confirmedDate, setConfirmedDate] = useState('');
  const [confirmedStartTime, setConfirmedStartTime] = useState('09:00');
  const [confirmedEndTime, setConfirmedEndTime] = useState('10:00');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const timeConstraintsToSlots = (
    constraints: { startTime: string; endTime: string }[]
  ): number[] => {
    const slots: number[] = [];
    constraints.forEach((constraint) => {
      const [startHour] = constraint.startTime.split(':').map(Number);
      const [endHour] = constraint.endTime.split(':').map(Number);
      for (let i = startHour; i < endHour; i++) {
        if (!slots.includes(i)) {
          slots.push(i);
        }
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
        if (i < sorted.length) {
          start = sorted[i];
          end = sorted[i];
        }
      }
    }

    return ranges;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [meetingData, friendsData] = await Promise.all([
          fetchMeeting(id),
          fetchFriends(),
        ]);

        setMeeting(meetingData);
        setMeetingStatus(meetingData.status);

        setName(meetingData.name);
        const from = new Date(meetingData.requirement.dateRangeStart);
        const to = new Date(meetingData.requirement.dateRangeEnd);
        setDateRange({ from, to });
        setIsAllDay(meetingData.requirement.isAllDay);

        // 확정된 날짜/시간 설정
        if (meetingData.confirmedStart) {
          const confirmDate = new Date(meetingData.confirmedStart);
          setConfirmedDateObj(confirmDate);
          setConfirmedDate(format(confirmDate, 'yyyy-MM-dd'));
          setConfirmedStartTime(format(confirmDate, 'HH:mm'));
        }
        if (meetingData.confirmedEnd) {
          setConfirmedEndTime(
            format(new Date(meetingData.confirmedEnd), 'HH:mm')
          );
        }

        if (
          meetingData.requirement.timeConstraints &&
          meetingData.requirement.timeConstraints.length > 0
        ) {
          const parsedConstraints = meetingData.requirement.timeConstraints.map(
            (constraint) => ({
              startTime: constraint.startTime.substring(0, 5),
              endTime: constraint.endTime.substring(0, 5),
            })
          );
          setSelectedTimeSlots(timeConstraintsToSlots(parsedConstraints));
        } else {
          setSelectedTimeSlots([9, 10, 11, 12, 13, 14, 15, 16, 17]);
        }

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

  const handleStatusChange = async (newStatus: MeetingStatus) => {
    if (newStatus === 'CONFIRMED') {
      setShowConfirmDialog(true);
    } else if (
      newStatus === 'PENDING' &&
      (meeting?.status === 'CONFIRMED' || meeting?.status === 'CLOSED')
    ) {
      setShowPendingDialog(true);
    } else {
      await updateStatus(newStatus);
    }
  };

  const updateStatus = async (
    newStatus: MeetingStatus,
    confirmedStart?: string,
    confirmedEnd?: string
  ) => {
    if (!meeting) return;

    setIsUpdatingStatus(true);
    try {
      const updatedMeeting = await updateMeetingState(meeting.id, {
        status: newStatus,
        confirmedStart,
        confirmedEnd,
      });

      setMeeting(updatedMeeting);
      setMeetingStatus(newStatus);

      toast({
        title: '상태 변경 완료',
        description: `모임 상태가 "${getStatusText(
          newStatus
        )}"(으)로 변경되었습니다.`,
      });

      // 확정 시 참여자들의 캘린더에 일정 추가 안내
      if (newStatus === 'CONFIRMED' && confirmedStart) {
        toast({
          title: '캘린더 일정 추가',
          description: '참여자들의 캘린더에 모임 일정이 추가되었습니다.',
        });
      }
    } catch (error) {
      console.error('Failed to update meeting status', error);
      toast({
        title: '상태 변경 실패',
        description: '모임 상태를 변경하는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleConfirmMeeting = async () => {
    if (!confirmedDate) {
      toast({ title: '입력 오류', description: '날짜를 선택해주세요.', variant: 'destructive' });
      return;
    }
    let startDateTime: Date;
    let endDateTime: Date;

    if (isAllDay) {
      // 종일: 00:00 ~ 23:59
      startDateTime = new Date(`${confirmedDate}T00:00:00`);
      endDateTime = new Date(`${confirmedDate}T23:59:00`);
    } else {
      if (!confirmedStartTime || !confirmedEndTime) {
        toast({ title: '입력 오류', description: '시간을 모두 선택해주세요.', variant: 'destructive' });
        return;
      }
      startDateTime = new Date(`${confirmedDate}T${confirmedStartTime}:00`);
      endDateTime = new Date(`${confirmedDate}T${confirmedEndTime}:00`);
      if (endDateTime <= startDateTime) {
        toast({ title: '입력 오류', description: '종료 시간은 시작 시간 이후여야 합니다.', variant: 'destructive' });
        return;
      }
    }

    setShowConfirmDialog(false);
    await updateStatus('CONFIRMED', startDateTime.toISOString(), endDateTime.toISOString());
  };

  const handleRevertToPending = async () => {
    setShowPendingDialog(false);
    await updateStatus('PENDING');
  };

  const getStatusText = (status: MeetingStatus) => {
    switch (status) {
      case 'PENDING':
        return '조율 중';
      case 'CONFIRMED':
        return '확정됨';
      case 'CLOSED':
        return '종료됨';
      default:
        return status;
    }
  };

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
      await updateParticipantSettings(meeting.id, {
        reflectTimetable,
        reflectCalendar,
      });

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

        const requirementPayload = {
          dateRangeStart: format(dateRange.from, 'yyyy-MM-dd'),
          dateRangeEnd: format(dateRange.to, 'yyyy-MM-dd'),
          isAllDay,
          timeConstraints,
        };

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
            {isHost && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  모임 상태 관리
                  <Badge
                    variant="outline"
                    className={
                      meeting.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-800'
                        : meeting.status === 'CONFIRMED'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }
                  >
                    {getStatusText(meeting.status)}
                  </Badge>
                </h2>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>모임 상태 변경</Label>
                    <Select
                      value={meetingStatus}
                      onValueChange={(value) =>
                        handleStatusChange(value as MeetingStatus)
                      }
                      disabled={isUpdatingStatus}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">조율 중</SelectItem>
                        <SelectItem value="CONFIRMED">확정됨</SelectItem>
                        <SelectItem value="CLOSED">종료됨</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {meeting.status === 'PENDING' &&
                        '참여자들이 일정을 조율할 수 있습니다.'}
                      {meeting.status === 'CONFIRMED' &&
                        '모임이 확정되어 참여자들이 일정을 변경할 수 없습니다.'}
                      {meeting.status === 'CLOSED' && '종료된 모임입니다.'}
                    </p>
                  </div>

                  {/* 확정된 날짜/시간 표시 */}
                  {meeting.confirmedStart && (
                    <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        확정된 일정
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        {format(
                          new Date(meeting.confirmedStart),
                          'yyyy년 M월 d일 (E) HH:mm',
                          { locale: ko }
                        )}
                        {meeting.confirmedEnd &&
                          ` ~ ${format(
                            new Date(meeting.confirmedEnd),
                            'HH:mm',
                            { locale: ko }
                          )}`}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {!isEditable && (
              <Card className="p-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900 dark:text-amber-100">
                      설정 변경 불가
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      모임이 {getStatusText(meeting.status)} 상태입니다.
                      {isHost
                        ? ' 조율 중으로 변경하면 설정을 수정할 수 있습니다.'
                        : ' 관리자가 조율 중으로 변경하면 설정을 수정할 수 있습니다.'}
                    </p>
                  </div>
                </div>
              </Card>
            )}

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
                      disabled={!isEditable}
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
                      disabled={!isEditable}
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
                      <p className="text-xs text-muted-foreground">
                        특정 시간대가 아닌 하루 전체를 선택합니다
                      </p>
                    </div>

                    {!isAllDay && (
                      <div className="space-y-4">
                        <Label className="text-base">시간 제약</Label>
                        <p className="text-xs text-muted-foreground">
                          드래그하여 모임이 가능한 시간대를 설정하세요. 여러
                          시간대를 자유롭게 선택할 수 있습니다.
                        </p>

                        <div className="p-4 rounded-lg border border-border bg-muted/30">
                          <div className="max-h-[400px] overflow-y-auto">
                            <TimeRangeSelector
                              selectedSlots={selectedTimeSlots}
                              onSlotsChange={
                                isEditable ? setSelectedTimeSlots : () => {}
                              }
                            />
                          </div>
                        </div>
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
                                      isEditable &&
                                      setSelectedFriends((prev) =>
                                        prev.includes(friend.id)
                                          ? prev.filter(
                                              (id) => id !== friend.id
                                            )
                                          : [...prev, friend.id]
                                      )
                                    }
                                    disabled={!isEditable}
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
              <>
                <Lock className="mr-2 h-4 w-4" />
                설정 변경 불가
              </>
            ) : isSaving ? (
              '저장 중...'
            ) : (
              '설정 저장'
            )}
          </Button>
        </div>

        {/* 모임 확정 다이얼로그 */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>모임 확정하기</DialogTitle>
              <DialogDescription>
                최종 모임 날짜와 시간을 선택해주세요. 확정되면 모든 참여자의
                캘린더에 일정이 추가됩니다.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>날짜</Label>
                <DatePicker
                  value={confirmedDateObj}
                  onChange={(date) => {
                    setConfirmedDateObj(date);
                    setConfirmedDate(date ? format(date, 'yyyy-MM-dd') : '');
                  }}
                  minDate={dateRange?.from}
                  maxDate={dateRange?.to}
                />
              </div>

              {/* 종일 토글 */}
              <div className="flex items-center justify-between rounded-lg bg-accent/40 px-4 py-3">
                <Label htmlFor="confirm-allday" className="cursor-pointer font-medium">
                  종일
                </Label>
                <Switch
                  id="confirm-allday"
                  checked={isAllDay}
                  onCheckedChange={setIsAllDay}
                />
              </div>

              {!isAllDay && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="confirm-start">시작 시간</Label>
                    <Input
                      id="confirm-start"
                      type="time"
                      value={confirmedStartTime}
                      onChange={(e) => setConfirmedStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-end">종료 시간</Label>
                    <Input
                      id="confirm-end"
                      type="time"
                      value={confirmedEndTime}
                      onChange={(e) => setConfirmedEndTime(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                disabled={isUpdatingStatus}
              >
                취소
              </Button>
              <Button
                onClick={handleConfirmMeeting}
                disabled={isUpdatingStatus || !confirmedDate}
              >
                {isUpdatingStatus ? '처리 중...' : '모임 확정'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 조율 중으로 되돌리기 확인 다이얼로그 */}
        <AlertDialog
          open={showPendingDialog}
          onOpenChange={setShowPendingDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>조율 중으로 변경하시겠습니까?</AlertDialogTitle>
              <AlertDialogDescription>
                모임을 조율 중으로 변경하면 참여자들이 다시 일정을 조율할 수
                있습니다.
                {meeting.confirmedStart && ' 기존 확정 일정은 유지됩니다.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isUpdatingStatus}>
                취소
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRevertToPending}
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus ? '처리 중...' : '조율 중으로 변경'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ProtectedRoute>
  );
}
