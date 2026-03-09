'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { BottomNav } from '@/components/bottom-nav';
import { WeeklySchedule } from '@/components/weekly-schedule';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Clock, Crown, LogOut, Settings, TrendingUp } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

export type TimeSlot = 'DAWN' | 'MORNING' | 'AFTERNOON' | 'EVENING';

export interface TimeSlotStat {
  slot: TimeSlot;
  count: number;
}

function getTimeSlotLabel(slot: TimeSlot): string {
  switch (slot) {
    case 'DAWN': return '새벽 (00–06시)';
    case 'MORNING': return '오전 (06–12시)';
    case 'AFTERNOON': return '오후 (12–18시)';
    case 'EVENING': return '저녁 (18–24시)';
  }
}

type TopPartner = { userId: string; name: string; meetingCount: number };

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [stats, setStats] = useState<{
    upcomingCount: number;
    thisMonthMeetingCount: number;
    timeSlotStats: TimeSlotStat[];
  } | null>(null);
  const [partners, setPartners] = useState<TopPartner[] | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const r1 = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE}/api/stats/dashboard`,
          { credentials: 'include' }
        );
        if (r1.ok) {
          const d = await r1.json();
          setStats({
            upcomingCount: d.upcomingCount,
            thisMonthMeetingCount: d.thisMonthMeetingCount,
            timeSlotStats: d.timeSlotStats ?? [],
          });
        }
        const r2 = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE}/api/stats/top-partners?limit=3`,
          { credentials: 'include' }
        );
        if (r2.ok) setPartners(await r2.json());
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, []);

  const timeStats = [...(stats?.timeSlotStats ?? [])].sort((a, b) => b.count - a.count);
  const maxCount = timeStats[0]?.count ?? 0;

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-background pb-16">

        {/* 헤더 */}
        <header className="page-header">
          <div className="page-header-inner">
            <h1 className="page-title">내 정보</h1>
            <button
              onClick={() => router.push('/settings')}
              className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-accent transition-colors"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="content-area">

          {/* 프로필 배너 */}
          <div className="relative">
            <div className="h-24 bg-gradient-to-r from-primary/40 via-primary/20 to-primary/5" />
            <div className="px-4 pb-4">
              <div className="flex items-end gap-4 -mt-10">
                <Avatar className="h-20 w-20 border-4 border-background shadow-sm">
                  <AvatarImage src={user?.profileImageUrl ?? undefined} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary font-semibold">
                    {user?.nickname?.[0] ?? '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="pb-1">
                  <h2 className="text-lg font-semibold text-foreground leading-tight">
                    {user?.nickname ?? '사용자'}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {user?.createdAt
                      ? `${new Date(user.createdAt).toLocaleDateString('ko-KR')} 가입`
                      : '일반 회원'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 space-y-5 pb-6">

            {/* 활동 통계 */}
            <section>
              <p className="section-title">이번 달 활동</p>
              <div className="notion-card p-4 grid grid-cols-2 gap-4">
                <div className="text-center py-2">
                  <div className="text-3xl font-bold text-primary leading-none">
                    {stats?.thisMonthMeetingCount ?? '–'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">참여한 모임</p>
                </div>
                <div className="text-center py-2 border-l border-border/40">
                  <div className="text-3xl font-bold text-primary leading-none">
                    {stats?.upcomingCount ?? '–'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">예정된 모임</p>
                </div>
              </div>
            </section>

            {/* 주간 일정 */}
            <section>
              <p className="section-title">주간 일정</p>
              <div className="notion-card p-4">
                <WeeklySchedule />
              </div>
            </section>

            {/* 자주 만나는 시간대 */}
            <section>
              <p className="section-title flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                자주 만나는 시간대
              </p>
              {!stats ? (
                <div className="h-8 flex items-center">
                  <span className="text-sm text-muted-foreground">불러오는 중...</span>
                </div>
              ) : timeStats.length === 0 ? (
                <p className="text-sm text-muted-foreground">아직 데이터가 없어요</p>
              ) : (
                <div className="notion-card divide-y divide-border/30">
                  {timeStats.map(({ slot, count }, i) => {
                    const isTop = count === maxCount;
                    const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
                    return (
                      <div key={slot} className={`flex items-center gap-3 p-3 ${isTop ? 'bg-amber-50/60 dark:bg-amber-900/10' : ''}`}>
                        {isTop
                          ? <Crown className="h-4 w-4 text-amber-500 flex-shrink-0" />
                          : <span className="text-xs text-muted-foreground/50 w-4 text-center flex-shrink-0">{i + 1}</span>
                        }
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-medium ${isTop ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'}`}>
                              {getTimeSlotLabel(slot)}
                            </span>
                            <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">{count}회</span>
                          </div>
                          <div className="h-1 rounded-full bg-border/40 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${isTop ? 'bg-amber-400' : 'bg-primary/40'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 가장 많이 만난 사람 */}
            <section>
              <p className="section-title flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3" />
                가장 많이 만난 친구
              </p>
              {!partners ? (
                <p className="text-sm text-muted-foreground">불러오는 중...</p>
              ) : partners.length === 0 ? (
                <p className="text-sm text-muted-foreground">아직 데이터가 없어요</p>
              ) : (
                <div className="notion-card divide-y divide-border/30">
                  {partners.map((p, i) => {
                    const isTop = i === 0;
                    return (
                      <div key={p.userId} className={`flex items-center gap-3 p-3 ${isTop ? 'bg-amber-50/60 dark:bg-amber-900/10' : ''}`}>
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 text-sm font-bold ${
                          isTop ? 'bg-amber-400 text-amber-900' : 'bg-accent text-muted-foreground'
                        }`}>
                          {isTop ? <Crown className="h-4 w-4" /> : i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isTop ? 'text-amber-800 dark:text-amber-300' : 'text-foreground'}`}>
                            {p.name}
                          </p>
                          <p className="text-xs text-muted-foreground">{p.meetingCount}회 함께 참석</p>
                        </div>
                        {isTop && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-700 dark:text-amber-400 flex-shrink-0">
                            TOP 1
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 로그아웃 */}
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-destructive rounded-xl border border-destructive/20 hover:bg-destructive/5 active:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </button>

          </div>
          </div>
        </main>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
