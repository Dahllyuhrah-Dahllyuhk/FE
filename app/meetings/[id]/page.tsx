'use client';

import type React from 'react';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  ChevronLeft,
  Calendar,
  Clock,
  Users,
  Settings,
  Trash2,
  Check,
  Lock,
  CheckCircle,
} from 'lucide-react';
import { MeetingCalendar } from '@/components/meeting-calendar';
import { ProtectedRoute } from '@/components/protected-route';
import { BottomNav } from '@/components/bottom-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import {
  fetchMeeting,
  deleteMeeting,
  acceptMeetingInvitation,
  inviteUserToMeeting,
  updateParticipantSettings,
} from '@/lib/api';
import type { Meeting, MeetingStatus } from '@/types/meeting';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const { user } = useAuth();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [reflectTimetable, setReflectTimetable] = useState(true);
  const [reflectCalendar, setReflectCalendar] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const meetingData = await fetchMeeting(id);
        setMeeting(meetingData);
      } catch (error) {
        console.error('Failed to load meeting details', error);
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
  }, [id]);

  const handleDeleteMeeting = async () => {
    if (!meeting) return;

    try {
      await deleteMeeting(meeting.id);
      toast({
        title: '모임 삭제됨',
        description: '모임이 성공적으로 삭제되었습니다.',
      });
      router.push('/meetings');
    } catch (error) {
      toast({
        title: '삭제 실패',
        description: '모임을 삭제하지 못했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleAcceptInvitationClick = () => {
    setShowAcceptDialog(true);
  };

  const handleConfirmAccept = async () => {
    if (!meeting?.id) return;

    try {
      setIsAccepting(true);

      await updateParticipantSettings(meeting.id, {
        reflectTimetable,
        reflectCalendar,
      });

      const updatedMeeting = await acceptMeetingInvitation(meeting.id);

      const refreshedMeeting = await fetchMeeting(meeting.id);
      setMeeting(refreshedMeeting);

      setShowAcceptDialog(false);
      toast({
        title: '초대 수락 완료',
        description: '모임 참여가 확정되었습니다. 일정을 조율해주세요.',
      });
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      toast({
        title: '오류 발생',
        description: '초대 수락에 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsAccepting(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meeting?.id || !inviteEmail) return;

    setIsInviting(true);
    try {
      const updatedMeeting = await inviteUserToMeeting(meeting.id, inviteEmail);
      setMeeting(updatedMeeting);
      setInviteEmail('');
      toast({
        title: '초대 완료',
        description: `${inviteEmail}님을 모임에 초대했습니다.`,
      });
    } catch (error) {
      console.error('Failed to invite user:', error);
      toast({
        title: '초대 실패',
        description: '사용자를 초대하는데 실패했습니다. 이메일을 확인해주세요.',
        variant: 'destructive',
      });
    } finally {
      setIsInviting(false);
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

  const isHost = user?.id === meeting.hostUserId;
  const currentParticipant = meeting.participants?.find(
    (p) => p.userId === user?.id
  );
  const isPending = currentParticipant?.status === 'PENDING';
  const isEditable = meeting.status === 'PENDING';
  const isConfirmed = meeting.status === 'CONFIRMED';
  const isClosed = meeting.status === 'CLOSED';
  const isAccepted =
    !isPending && (currentParticipant?.status === 'ACCEPTED' || isHost);

  const acceptedParticipants =
    meeting.participants?.filter((p) => p.status === 'ACCEPTED') || [];
  const pendingParticipants =
    meeting.participants?.filter((p) => p.status === 'PENDING') || [];

  const getStatusBadge = (status: MeetingStatus) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-500 text-white border-0';
      case 'CONFIRMED':
        return 'bg-green-500 text-white border-0';
      case 'CLOSED':
        return 'bg-gray-500 text-white border-0';
      default:
        return 'bg-muted text-muted-foreground';
    }
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

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-background">
        <header className="border-b border-border bg-card px-4 py-4 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground truncate flex-1">
              {meeting.name}
            </h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push(`/meetings/${meeting.id}/settings`)}
              >
                <Settings className="h-5 w-5" />
              </Button>

              {isHost && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-5 w-5 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        모임을 삭제하시겠습니까?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        이 작업은 되돌릴 수 없습니다. 모임의 모든 데이터가
                        영구적으로 삭제됩니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteMeeting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        삭제
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 pb-48 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            {(isConfirmed || isClosed) && (
              <Card
                className={`border-0 ${
                  isConfirmed
                    ? 'bg-green-50 dark:bg-green-950/30'
                    : 'bg-gray-50 dark:bg-gray-950/30'
                }`}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  {isConfirmed ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <Lock className="h-5 w-5 text-gray-600" />
                  )}
                  <div>
                    <p
                      className={`font-medium ${
                        isConfirmed
                          ? 'text-green-900 dark:text-green-100'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      {isConfirmed
                        ? '모임이 확정되었습니다'
                        : '종료된 모임입니다'}
                    </p>
                    {meeting.confirmedStart && (
                      <p
                        className={`text-sm ${
                          isConfirmed
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
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
                    )}
                    {!isHost && (
                      <p className="text-xs text-muted-foreground mt-1">
                        관리자가 조율 중으로 변경하면 다시 설정할 수 있습니다.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* PENDING 상태 알림 및 수락 버튼 - 조율 중일 때만 표시 */}
            {isPending && isEditable && (
              <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30">
                <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-yellow-900 dark:text-yellow-100">
                      초대된 모임입니다
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      참여하여 일정을 조율하시겠습니까?
                    </p>
                  </div>
                  <Button
                    onClick={handleAcceptInvitationClick}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white w-full sm:w-auto"
                  >
                    <Check className="mr-2 h-4 w-4" /> 수락하고 일정 반영
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* 확정됨/종료됨 상태에서 PENDING인 경우 */}
            {isPending && !isEditable && (
              <Card className="border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-gray-500" />
                    <p className="text-gray-700 dark:text-gray-300">
                      모임이 {getStatusText(meeting.status)} 상태입니다. 현재
                      초대에 응답할 수 없습니다.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Dialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>일정 반영 설정</DialogTitle>
                  <DialogDescription>
                    내 시간표와 캘린더 일정을 자동으로 반영하시겠습니까? 나중에
                    설정에서 변경할 수 있습니다.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="timetable" className="flex flex-col gap-1">
                      <span>주간 시간표 반영</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        내 주간 시간표를 자동으로 불가능 시간으로 설정합니다
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
                        내 캘린더 일정을 자동으로 불가능 시간으로 설정합니다
                      </span>
                    </Label>
                    <Switch
                      id="calendar"
                      checked={reflectCalendar}
                      onCheckedChange={setReflectCalendar}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowAcceptDialog(false)}
                    disabled={isAccepting}
                  >
                    취소
                  </Button>
                  <Button onClick={handleConfirmAccept} disabled={isAccepting}>
                    {isAccepting ? '수락 중...' : '확인'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Card className="p-4">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold">{meeting.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {getStatusText(meeting.status)}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={getStatusBadge(meeting.status)}
                >
                  {getStatusText(meeting.status)}
                </Badge>
              </div>

              <div className="space-y-3">
                {meeting.confirmedStart ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-700 dark:text-green-400">
                      {format(
                        new Date(meeting.confirmedStart),
                        'yyyy년 M월 d일 (E) HH:mm',
                        { locale: ko }
                      )}
                      {meeting.confirmedEnd &&
                        ` ~ ${format(new Date(meeting.confirmedEnd), 'HH:mm', {
                          locale: ko,
                        })}`}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(
                        new Date(meeting.requirement.dateRangeStart),
                        'M월 d일 (E)',
                        { locale: ko }
                      )}{' '}
                      ~{' '}
                      {format(
                        new Date(meeting.requirement.dateRangeEnd),
                        'M월 d일 (E)',
                        { locale: ko }
                      )}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {meeting.participants?.length ||
                      meeting.invitedUserIds?.length ||
                      0}
                    명 참여 중
                  </span>
                </div>
                {meeting.requirement.isAllDay && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>하루 종일</span>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5" />
                참여자 목록
              </h3>

              {/* 수락한 참여자 */}
              {acceptedParticipants.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    참여 확정 ({acceptedParticipants.length}명)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {acceptedParticipants.map((participant) => (
                      <div
                        key={participant.userId}
                        className="flex items-center gap-2 px-3 py-2 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-green-500 text-white">
                            {participant.name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {participant.name}
                          {participant.userId === meeting.hostUserId && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              (호스트)
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pendingParticipants.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    응답 대기 ({pendingParticipants.length}명) - 일정 미설정
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {pendingParticipants.map((participant) => (
                      <div
                        key={participant.userId}
                        className="flex items-center gap-2 px-3 py-2 rounded-full bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-gray-400 text-white">
                            {participant.name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-muted-foreground">
                          {participant.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-xs bg-gray-200 dark:bg-gray-700 border-0"
                        >
                          UNSET
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!meeting.participants || meeting.participants.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  참여자가 없습니다
                </p>
              )}
            </Card>

            {isAccepted ? (
              <div className="h-[calc(100vh-280px)] min-h-[500px]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">일정 조율</h3>
                  {!isEditable && (
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      <Lock className="h-3 w-3" />
                      읽기 전용
                    </Badge>
                  )}
                </div>
                {isEditable ? (
                  <p className="mb-4 text-sm text-muted-foreground">
                    가능한 날짜와 시간을 선택해주세요.
                  </p>
                ) : (
                  <p className="mb-4 text-sm text-muted-foreground">
                    모임이 {getStatusText(meeting.status)} 상태입니다. 관리자가
                    조율 중으로 변경하면 수정할 수 있습니다.
                  </p>
                )}
                <MeetingCalendar
                  meeting={meeting}
                  currentUserId={user?.id}
                  readonly={!isEditable}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border rounded-lg bg-muted/10">
                <Calendar className="h-12 w-12 mb-4 opacity-20" />
                <p>초대를 수락하면 일정을 조율할 수 있습니다.</p>
              </div>
            )}
          </div>
        </main>
        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
