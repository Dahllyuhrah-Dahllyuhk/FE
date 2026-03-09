'use client';

import type React from 'react';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  ChevronLeft, Calendar, Clock, Users, Settings,
  Trash2, Check, Lock, CheckCircle, Share2, Copy, CheckCheck,
} from 'lucide-react';
import { MeetingCalendar } from '@/components/meeting-calendar';
import { ProtectedRoute } from '@/components/protected-route';
import { BottomNav } from '@/components/bottom-nav';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import {
  fetchMeeting, deleteMeeting, acceptMeetingInvitation,
  inviteUserToMeeting, updateParticipantSettings, getMeetingInviteCode,
} from '@/lib/api';
import type { Meeting, MeetingStatus } from '@/types/meeting';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

/* ─── 헬퍼 ─── */
function getStatusText(status: MeetingStatus) {
  switch (status) {
    case 'PENDING': return '조율 중';
    case 'CONFIRMED': return '확정됨';
    case 'CLOSED': return '종료됨';
    default: return status;
  }
}

function StatusPill({ status }: { status: MeetingStatus }) {
  const cfg = {
    PENDING:   { dot: 'bg-amber-400',  text: 'text-amber-700 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-900/20' },
    CONFIRMED: { dot: 'bg-green-500',  text: 'text-green-700 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-900/20' },
    CLOSED:    { dot: 'bg-muted-foreground/40', text: 'text-muted-foreground', bg: 'bg-muted/40' },
  }[status] ?? { dot: 'bg-muted-foreground/40', text: 'text-muted-foreground', bg: 'bg-muted/40' };

  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {getStatusText(status)}
    </span>
  );
}

/* ─── 메인 ─── */
export default function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const { user } = useAuth();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [reflectTimetable, setReflectTimetable] = useState(true);
  const [reflectCalendar, setReflectCalendar] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    fetchMeeting(id)
      .then(setMeeting)
      .catch(() => toast({ title: '로드 실패', variant: 'destructive' }))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!meeting) return;
    try {
      await deleteMeeting(meeting.id);
      toast({ title: '모임 삭제됨' });
      router.push('/meetings');
    } catch {
      toast({ title: '삭제 실패', variant: 'destructive' });
    }
  };

  const handleConfirmAccept = async () => {
    if (!meeting?.id) return;
    setIsAccepting(true);
    try {
      await updateParticipantSettings(meeting.id, { reflectTimetable, reflectCalendar });
      await acceptMeetingInvitation(meeting.id);
      setMeeting(await fetchMeeting(meeting.id));
      setShowAcceptDialog(false);
      toast({ title: '초대 수락 완료', description: '일정을 조율해주세요.' });
    } catch {
      toast({ title: '오류 발생', variant: 'destructive' });
    } finally {
      setIsAccepting(false);
    }
  };

  /* ─── 로딩 / 에러 ─── */
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-r-transparent animate-spin" />
      </div>
    );
  }
  if (!meeting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <p className="text-sm text-muted-foreground">모임을 찾을 수 없습니다.</p>
        <Button variant="outline" size="sm" onClick={() => router.back()}>돌아가기</Button>
      </div>
    );
  }

  /* ─── 상태 계산 ─── */
  const isHost       = user?.id === meeting.hostUserId;
  const participant  = meeting.participants?.find(p => p.userId === user?.id);
  const isPending    = participant?.status === 'PENDING';
  const isAccepted   = !isPending && (participant?.status === 'ACCEPTED' || isHost);
  const isEditable   = meeting.status === 'PENDING';
  const isConfirmed  = meeting.status === 'CONFIRMED';
  const isClosed     = meeting.status === 'CLOSED';
  const accepted     = meeting.participants?.filter(p => p.status === 'ACCEPTED') ?? [];
  const pendingList  = meeting.participants?.filter(p => p.status === 'PENDING') ?? [];

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-background">

        {/* ── 헤더 ── */}
        <header className="page-header">
          <div className="flex items-center gap-1 px-2 h-12">
            <button
              onClick={() => router.back()}
              className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-foreground/70" />
            </button>
            <h1 className="flex-1 text-sm font-semibold text-foreground truncate px-1">
              {meeting.name}
            </h1>
            <div className="flex items-center gap-1">
              <button
                onClick={() => router.push(`/meetings/${meeting.id}/settings`)}
                className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent transition-colors"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
              </button>
              {isHost && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-destructive/10 transition-colors">
                      <Trash2 className="h-4 w-4 text-destructive/70" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>모임을 삭제할까요?</AlertDialogTitle>
                      <AlertDialogDescription>
                        삭제하면 되돌릴 수 없습니다. 모든 데이터가 영구 삭제됩니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground"
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

        <main className="flex-1 overflow-y-auto p-4 pb-24 space-y-4">

          {/* ── 모임 요약 카드 ── */}
          <div className="notion-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-semibold text-foreground leading-tight">{meeting.name}</h2>
              <StatusPill status={meeting.status} />
            </div>

            <div className="space-y-1.5 text-xs text-muted-foreground">
              {meeting.confirmedStart ? (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
                  <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>
                    {format(new Date(meeting.confirmedStart), 'yyyy년 M월 d일 (E) HH:mm', { locale: ko })}
                    {meeting.confirmedEnd && ` ~ ${format(new Date(meeting.confirmedEnd), 'HH:mm', { locale: ko })}`}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>
                    {format(new Date(meeting.requirement.dateRangeStart), 'M월 d일 (E)', { locale: ko })}
                    {' ~ '}
                    {format(new Date(meeting.requirement.dateRangeEnd), 'M월 d일 (E)', { locale: ko })}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{meeting.participants?.length ?? 0}명 참여 중</span>
              </div>
              {meeting.requirement.isAllDay && (
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>하루 종일</span>
                </div>
              )}
            </div>
          </div>

          {/* ── 확정/종료 배너 ── */}
          {(isConfirmed || isClosed) && (
            <div className={`rounded-xl px-4 py-3 flex items-start gap-3 ${
              isConfirmed
                ? 'bg-green-50 dark:bg-green-900/15 border border-green-200/60 dark:border-green-800/40'
                : 'bg-muted/40 border border-border/40'
            }`}>
              {isConfirmed
                ? <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                : <Lock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              }
              <div>
                <p className={`text-sm font-medium ${isConfirmed ? 'text-green-800 dark:text-green-300' : 'text-muted-foreground'}`}>
                  {isConfirmed ? '모임이 확정되었습니다' : '종료된 모임입니다'}
                </p>
                {meeting.confirmedStart && isConfirmed && (
                  <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                    {format(new Date(meeting.confirmedStart), 'M월 d일 (E) HH:mm', { locale: ko })}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── 초대 수락 배너 ── */}
          {isPending && isEditable && (
            <div className="rounded-xl px-4 py-3 flex items-center justify-between gap-3 bg-amber-50 dark:bg-amber-900/15 border border-amber-200/60 dark:border-amber-800/40">
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">초대된 모임입니다</p>
                <p className="text-xs text-amber-600 dark:text-amber-400">수락하고 일정을 조율해주세요</p>
              </div>
              <button
                onClick={() => setShowAcceptDialog(true)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors flex-shrink-0"
              >
                <Check className="h-3.5 w-3.5" />
                수락
              </button>
            </div>
          )}

          {isPending && !isEditable && (
            <div className="rounded-xl px-4 py-3 bg-muted/40 border border-border/40">
              <p className="text-sm text-muted-foreground">
                모임이 {getStatusText(meeting.status)} 상태로 현재 응답할 수 없습니다.
              </p>
            </div>
          )}

          {/* ── 초대 코드 (호스트만, PENDING 상태) ── */}
          {isHost && meeting.status === 'PENDING' && (
            <div className="notion-card p-4">
              <p className="section-title flex items-center gap-1.5 mb-3">
                <Share2 className="h-3 w-3" />
                초대 코드
              </p>
              {inviteCode ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 bg-muted/40 rounded-xl border border-border/40">
                    <code className="flex-1 text-center text-lg font-mono font-bold tracking-widest text-foreground">
                      {inviteCode}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(inviteCode);
                        setCodeCopied(true);
                        setTimeout(() => setCodeCopied(false), 2000);
                      }}
                      className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
                    >
                      {codeCopied ? <CheckCheck className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/meetings/join?code=${inviteCode}`;
                      navigator.clipboard.writeText(url);
                      setCodeCopied(true);
                      setTimeout(() => setCodeCopied(false), 2000);
                    }}
                    className="w-full text-xs text-primary hover:underline"
                  >
                    초대 링크 복사
                  </button>
                  <p className="text-[11px] text-muted-foreground text-center">
                    친구에게 코드를 알려주거나 링크를 공유하세요
                  </p>
                </div>
              ) : (
                <button
                  onClick={async () => {
                    try {
                      const code = await getMeetingInviteCode(meeting.id);
                      setInviteCode(code);
                    } catch {
                      toast({ title: '코드 조회 실패', variant: 'destructive' });
                    }
                  }}
                  className="w-full py-2 text-sm text-primary hover:underline"
                >
                  초대 코드 보기
                </button>
              )}
            </div>
          )}

          {/* ── 참여자 ── */}
          <div className="notion-card p-4">
            <p className="section-title flex items-center gap-1.5">
              <Users className="h-3 w-3" />
              참여자
            </p>

            {accepted.length > 0 && (
              <div className="mb-3">
                <p className="text-[11px] text-muted-foreground mb-2">참여 확정 {accepted.length}명</p>
                <div className="flex flex-wrap gap-2">
                  {accepted.map(p => (
                    <div key={p.userId} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200/60 dark:border-green-800/40">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[10px] bg-green-500 text-white">
                          {p.name?.[0] ?? '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium text-green-800 dark:text-green-300">
                        {p.name}
                        {p.userId === meeting.hostUserId && <span className="opacity-60 ml-1">호스트</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pendingList.length > 0 && (
              <div>
                <p className="text-[11px] text-muted-foreground mb-2">응답 대기 {pendingList.length}명</p>
                <div className="flex flex-wrap gap-2">
                  {pendingList.map(p => (
                    <div key={p.userId} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-accent border border-border/40">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[10px] bg-muted-foreground/30 text-muted-foreground">
                          {p.name?.[0] ?? '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!meeting.participants?.length && (
              <p className="text-sm text-muted-foreground text-center py-3">참여자가 없습니다</p>
            )}
          </div>

          {/* ── 일정 조율 ── */}
          {isAccepted ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="section-title mb-0">일정 조율</p>
                {!isEditable && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    읽기 전용
                  </span>
                )}
              </div>
              {isEditable && (
                <p className="text-xs text-muted-foreground mb-3">가능한 날짜와 시간을 선택해주세요.</p>
              )}
              <div className="min-h-[500px]">
                <MeetingCalendar
                  meeting={meeting}
                  currentUserId={user?.id}
                  readonly={!isEditable}
                />
              </div>
            </div>
          ) : (
            <div className="notion-card flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Calendar className="h-8 w-8 mb-3 opacity-20" />
              <p className="text-sm">초대를 수락하면 일정을 조율할 수 있습니다.</p>
            </div>
          )}
        </main>

        {/* ── 초대 수락 다이얼로그 ── */}
        <Dialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
          <DialogContent className="rounded-2xl max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base">일정 반영 설정</DialogTitle>
              <DialogDescription className="text-xs">
                내 시간표와 캘린더를 자동으로 반영할 수 있어요. 나중에 설정에서 변경 가능합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="timetable" className="flex flex-col gap-0.5 cursor-pointer">
                  <span className="text-sm font-medium">주간 시간표 반영</span>
                  <span className="text-xs text-muted-foreground font-normal">시간표를 불가능 시간으로 자동 설정</span>
                </Label>
                <Switch id="timetable" checked={reflectTimetable} onCheckedChange={setReflectTimetable} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="calendar-reflect" className="flex flex-col gap-0.5 cursor-pointer">
                  <span className="text-sm font-medium">캘린더 일정 반영</span>
                  <span className="text-xs text-muted-foreground font-normal">캘린더 일정을 불가능 시간으로 자동 설정</span>
                </Label>
                <Switch id="calendar-reflect" checked={reflectCalendar} onCheckedChange={setReflectCalendar} />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAcceptDialog(false)} disabled={isAccepting}>
                취소
              </Button>
              <Button size="sm" onClick={handleConfirmAccept} disabled={isAccepting}>
                {isAccepting ? '처리 중...' : '수락'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
