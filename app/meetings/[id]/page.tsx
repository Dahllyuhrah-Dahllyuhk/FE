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
import type { Meeting } from '@/types/meeting';
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

      // 3. 모임 데이터 새로고침
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

  const isAccepted =
    !isPending && (currentParticipant?.status === 'ACCEPTED' || isHost);

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
            {/* PENDING 상태 알림 및 수락 버튼 */}
            {isPending && (
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
                    {meeting.status === 'CONFIRMED'
                      ? '확정된 모임'
                      : '시간 조율 중'}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    meeting.status === 'CONFIRMED'
                      ? 'bg-green-500 text-white border-0'
                      : 'bg-yellow-500 text-white border-0'
                  }
                >
                  {meeting.status === 'CONFIRMED' ? '확정' : '조율중'}
                </Badge>
              </div>

              <div className="space-y-3">
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

            {/* 일정 조율 캘린더 (ACCEPTED 상태일 때만 표시) */}
            {isAccepted ? (
              <div className="h-[calc(100vh-280px)] min-h-[600px]">
                <h3 className="mb-3 text-lg font-semibold">일정 조율</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  가능한 날짜와 시간을 선택해주세요.
                </p>
                <MeetingCalendar meeting={meeting} currentUserId={user?.id} />
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
