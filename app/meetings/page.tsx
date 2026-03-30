'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { BottomNav } from '@/components/bottom-nav';
import { Plus, Calendar, Search, Users, Loader2, LogIn, X } from 'lucide-react';
import { fetchMeetings, joinMeetingByCode } from '@/lib/api';
import type { Meeting, MeetingStatus } from '@/types/meeting';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useAuth } from '@/context/auth-context';
import { toast } from '@/hooks/use-toast';

export default function MeetingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // 코드 참여 모달
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    const loadMeetings = async () => {
      try {
        const data = await fetchMeetings();
        setMeetings(data);
      } catch (error) {
        console.error('Failed to fetch meetings', error);
        toast({ title: '모임 목록을 불러오지 못했습니다.', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };
    loadMeetings();
  }, []);

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 6) {
      toast({ title: '유효한 초대 코드를 입력해주세요.', variant: 'destructive' });
      return;
    }
    setIsJoining(true);
    try {
      const meeting = await joinMeetingByCode(code);
      toast({ title: '모임 참여 완료!', description: `"${meeting.name}"에 참여했습니다.` });
      setShowJoinModal(false);
      setJoinCode('');
      router.push(`/meetings/${meeting.id}`);
    } catch (e: any) {
      const msg: string = e?.message ?? '참여에 실패했습니다.';
      const alreadyMatch = msg.match(/meetingId=([a-zA-Z0-9]+)/);
      if (alreadyMatch) {
        toast({ title: '이미 참여 중인 모임입니다.', description: '모임 페이지로 이동합니다.' });
        setShowJoinModal(false);
        router.push(`/meetings/${alreadyMatch[1]}`);
        return;
      }
      toast({ title: msg, variant: 'destructive' });
    } finally {
      setIsJoining(false);
    }
  };

  const filteredMeetings = meetings.filter((meeting) => {
    const matchesSearch = meeting.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'pending' && meeting.status === 'PENDING') ||
      (activeTab === 'confirmed' && meeting.status === 'CONFIRMED') ||
      (activeTab === 'closed' && meeting.status === 'CLOSED');

    return matchesSearch && matchesTab;
  });

  const getStatusColor = (status: MeetingStatus) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-400';
      case 'CONFIRMED': return 'bg-green-500';
      case 'CLOSED': return 'bg-muted-foreground/40';
      default: return 'bg-muted-foreground/40';
    }
  };

  const getStatusTextColor = (status: MeetingStatus) => {
    switch (status) {
      case 'PENDING': return 'text-amber-600 dark:text-amber-400';
      case 'CONFIRMED': return 'text-green-600 dark:text-green-400';
      case 'CLOSED': return 'text-muted-foreground';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusText = (status: MeetingStatus) => {
    switch (status) {
      case 'PENDING': return '조율 중';
      case 'CONFIRMED': return '확정됨';
      case 'CLOSED': return '종료됨';
      default: return status;
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-background pb-16">
        <header className="page-header">
          <div className="page-header-inner">
            <h1 className="page-title">모임</h1>
            <div className="flex items-center gap-1">
              {/* 코드로 참여 버튼 */}
              <button
                onClick={() => setShowJoinModal(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-primary hover:bg-primary/8 transition-colors border border-primary/30"
              >
                <LogIn className="h-3 w-3" />
                코드 참여
              </button>
              <button
                onClick={() => router.push('/meetings/create')}
                className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-accent transition-colors"
              >
                <Plus className="h-4 w-4 text-foreground/70" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4">
          <div className="content-area space-y-3">
          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="모임 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm bg-accent/40 rounded-lg border-0 outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
            />
          </div>

          {/* 탭 */}
          <div className="flex gap-1 p-1 bg-accent/40 rounded-lg">
            {[
              { value: 'all', label: '전체' },
              { value: 'pending', label: '조율 중' },
              { value: 'confirmed', label: '확정' },
              { value: 'closed', label: '종료' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeTab === tab.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 목록 */}
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <Calendar className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? '검색 결과가 없습니다' : '새로운 모임을 추가해보세요'}
              </p>
              {!searchQuery && (
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => router.push('/meetings/create')}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    모임 만들기
                  </button>
                  <button
                    onClick={() => setShowJoinModal(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    초대 코드로 모임 참여하기
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMeetings.map((meeting) => {
                const currentParticipant = meeting.participants?.find(
                  (p) => p.userId === user?.id
                );
                const isPending = currentParticipant?.status === 'PENDING';

                return (
                  <button
                    key={meeting.id}
                    className="notion-card notion-card-hover w-full text-left p-4 block"
                    onClick={() => router.push(`/meetings/${meeting.id}`)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${getStatusColor(meeting.status)}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="text-sm font-medium text-foreground truncate">
                            {meeting.name}
                          </span>
                          {isPending && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              초대됨
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {meeting.confirmedStart
                              ? format(new Date(meeting.confirmedStart), 'M월 d일 HH:mm', { locale: ko })
                              : `${format(new Date(meeting.requirement.dateRangeStart), 'M월 d일', { locale: ko })} ~ ${format(new Date(meeting.requirement.dateRangeEnd), 'M월 d일', { locale: ko })}`}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {meeting.participants?.length ?? meeting.invitedUserIds?.length ?? 0}명
                          </span>
                          <span className={`text-[10px] font-medium ${getStatusTextColor(meeting.status)}`}>
                            {getStatusText(meeting.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          </div>
        </main>

        <BottomNav />
      </div>

      {/* 코드 참여 모달 */}
      {showJoinModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowJoinModal(false); setJoinCode(''); } }}
        >
          <div className="w-full sm:max-w-sm bg-background rounded-t-2xl sm:rounded-2xl border border-border/40 shadow-2xl overflow-hidden">
            {/* 모바일 핸들 */}
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="w-8 h-1 rounded-full bg-border/60" />
            </div>

            <div className="px-5 pt-4 pb-2 flex items-center justify-between">
              <h3 className="text-base font-semibold">초대 코드로 참여</h3>
              <button
                onClick={() => { setShowJoinModal(false); setJoinCode(''); }}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-accent text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 pb-5 space-y-3">
              <p className="text-xs text-muted-foreground">
                모임 호스트에게 받은 초대 코드를 입력해주세요.
              </p>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                placeholder="예: AB3DEFGH"
                maxLength={8}
                autoFocus
                className="w-full text-center text-xl font-mono tracking-widest py-3 rounded-xl border border-border/60 bg-accent/20 outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40 placeholder:text-base placeholder:tracking-normal"
              />
              <button
                onClick={handleJoin}
                disabled={isJoining || joinCode.trim().length < 6}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
              >
                <LogIn className="h-4 w-4" />
                {isJoining ? '참여 중...' : '모임 참여'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}


