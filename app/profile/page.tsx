'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { BottomNav } from '@/components/bottom-nav';
import { WeeklySchedule } from '@/components/weekly-schedule';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Calendar, Clock, Crown, LogOut, Settings, TrendingUp,
  CalendarCheck, CalendarClock, ChevronRight, Star,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { toast } from '@/hooks/use-toast';

export type TimeSlot = 'DAWN' | 'MORNING' | 'AFTERNOON' | 'EVENING';
export interface TimeSlotStat { slot: TimeSlot; count: number; }
type TopPartner = { userId: string; name: string; meetingCount: number };

const TIME_SLOT_META: Record<TimeSlot, { label: string; emoji: string; color: string; bg: string }> = {
  DAWN:      { label: '새벽', emoji: '🌙', color: 'text-indigo-500', bg: 'bg-indigo-500' },
  MORNING:   { label: '오전', emoji: '🌅', color: 'text-amber-500',  bg: 'bg-amber-500'  },
  AFTERNOON: { label: '오후', emoji: '☀️', color: 'text-orange-500', bg: 'bg-orange-500' },
  EVENING:   { label: '저녁', emoji: '🌆', color: 'text-rose-500',   bg: 'bg-rose-500'   },
};
const TIME_SLOT_RANGE: Record<TimeSlot, string> = {
  DAWN: '00–06시', MORNING: '06–12시', AFTERNOON: '12–18시', EVENING: '18–24시',
};

function StatCard({ value, label, icon: Icon, accent = false }: {
  value: number | string; label: string; icon: React.ElementType; accent?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl p-4 ${
      accent ? 'bg-primary text-primary-foreground' : 'bg-accent/50 text-foreground'
    }`}>
      <Icon className={`h-5 w-5 ${accent ? 'text-primary-foreground/70' : 'text-muted-foreground'}`} />
      <span className={`text-3xl font-bold leading-none tabular-nums ${accent ? '' : 'text-primary'}`}>
        {value ?? '–'}
      </span>
      <span className={`text-[11px] font-medium text-center leading-tight ${
        accent ? 'text-primary-foreground/80' : 'text-muted-foreground'
      }`}>{label}</span>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [stats, setStats] = useState<{
    upcomingCount: number;
    thisMonthMeetingCount: number;
    timeSlotStats: TimeSlotStat[];
  } | null>(null);
  const [partners, setPartners] = useState<TopPartner[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [r1, r2] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/stats/dashboard`, { credentials: 'include' }),
          fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/stats/top-partners?limit=3`, { credentials: 'include' }),
        ]);
        if (r1.ok) {
          const d = await r1.json();
          setStats({ upcomingCount: d.upcomingCount, thisMonthMeetingCount: d.thisMonthMeetingCount, timeSlotStats: d.timeSlotStats ?? [] });
        }
        if (r2.ok) setPartners(await r2.json());
      } catch (e) {
        console.error(e);
        toast({ title: '통계를 불러오지 못했습니다.', variant: 'destructive' });
      } finally { setLoading(false); }
    }
    load();
  }, []);

  const timeStats = [...(stats?.timeSlotStats ?? [])].sort((a, b) => b.count - a.count);
  const maxCount = timeStats[0]?.count ?? 0;
  const topSlot = timeStats[0]?.slot;

  const joinDate = user?.createdAt ? new Date(user.createdAt) : null;
  const daysSinceJoin = joinDate
    ? Math.floor((Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-background pb-20">

        {/* 헤더 */}
        <header className="page-header">
          <div className="page-header-inner">
            <h1 className="page-title">내 정보</h1>
            <button
              onClick={() => router.push('/settings')}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-accent transition-colors"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="content-area">

            {/* 프로필 히어로 */}
            <div className="relative overflow-hidden">
              {/* 배경 그라디언트 */}
              <div className="h-28 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent" />
              {/* 장식 원 */}
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-primary/10 -translate-y-1/2 translate-x-1/4" />
              <div className="absolute top-4 right-12 w-20 h-20 rounded-full bg-primary/8" />

              <div className="px-4 pb-5 -mt-12 relative">
                <div className="flex items-end justify-between">
                  <div className="flex items-end gap-3">
                    <div className="relative">
                      <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                        <AvatarImage src={user?.profileImageUrl ?? undefined} />
                        <AvatarFallback className="text-3xl bg-gradient-to-br from-primary/20 to-primary/40 text-primary font-bold">
                          {user?.nickname?.[0] ?? '?'}
                        </AvatarFallback>
                      </Avatar>
                      {daysSinceJoin !== null && daysSinceJoin <= 30 && (
                        <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          NEW
                        </span>
                      )}
                    </div>
                    <div className="pb-1 space-y-0.5">
                      <h2 className="text-xl font-bold text-foreground leading-tight">
                        {user?.nickname ?? '사용자'}
                      </h2>
                      {joinDate && (
                        <p className="text-xs text-muted-foreground">
                          {joinDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 가입
                        </p>
                      )}
                      {daysSinceJoin !== null && (
                        <p className="text-[11px] text-primary/70 font-medium">
                          맞춰봄과 함께한 지 {daysSinceJoin}일
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 space-y-6 pb-6">

              {/* 활동 통계 카드 */}
              <section>
                <p className="section-title">이번 달 활동</p>
                {loading ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[0, 1].map(i => (
                      <div key={i} className="h-28 rounded-2xl bg-accent/30 animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard value={stats?.thisMonthMeetingCount ?? 0} label="참여한 모임" icon={CalendarCheck} accent />
                    <StatCard value={stats?.upcomingCount ?? 0} label="예정된 모임" icon={CalendarClock} />
                  </div>
                )}
              </section>

              {/* 주간 일정 */}
              <section>
                <p className="section-title">주간 시간표</p>
                <div className="notion-card px-3 py-4">
                  <WeeklySchedule />
                </div>
              </section>

              {/* 자주 만나는 시간대 */}
              <section>
                <p className="section-title flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  모임 활동 시간대
                </p>
                {loading ? (
                  <div className="h-32 rounded-xl bg-accent/30 animate-pulse" />
                ) : timeStats.length === 0 ? (
                  <div className="notion-card p-6 flex flex-col items-center gap-2 text-center">
                    <Clock className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">아직 모임 데이터가 없어요</p>
                  </div>
                ) : (
                  <div className="notion-card overflow-hidden">
                    {/* 대표 시간대 배너 */}
                    {topSlot && (
                      <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-amber-50/0 dark:from-amber-900/20 dark:to-transparent border-b border-border/30 flex items-center gap-2">
                        <Crown className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                          주로 <span className="font-bold">{TIME_SLOT_META[topSlot].label} ({TIME_SLOT_RANGE[topSlot]})</span>에 모임을 가져요
                        </span>
                      </div>
                    )}
                    <div className="divide-y divide-border/30">
                      {timeStats.map(({ slot, count }, i) => {
                        const meta = TIME_SLOT_META[slot];
                        const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
                        const isTop = i === 0;
                        return (
                          <div key={slot} className="flex items-center gap-3 px-4 py-3">
                            <span className="text-xl w-7 text-center flex-shrink-0">{meta.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-semibold text-foreground">
                                  {meta.label}
                                  <span className="text-muted-foreground font-normal ml-1">({TIME_SLOT_RANGE[slot]})</span>
                                </span>
                                <span className="text-xs font-bold text-foreground tabular-nums ml-2">{count}회</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-border/40 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${isTop ? meta.bg : 'bg-muted-foreground/30'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>

              {/* 자주 만난 친구 */}
              <section>
                <p className="section-title flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3" />
                  자주 만난 친구
                </p>
                {loading ? (
                  <div className="h-32 rounded-xl bg-accent/30 animate-pulse" />
                ) : !partners || partners.length === 0 ? (
                  <div className="notion-card p-6 flex flex-col items-center gap-2 text-center">
                    <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">아직 함께한 모임이 없어요</p>
                  </div>
                ) : (
                  <div className="notion-card divide-y divide-border/30 overflow-hidden">
                    {partners.map((p, i) => {
                      const medals = ['🥇', '🥈', '🥉'];
                      return (
                        <div key={p.userId} className={`flex items-center gap-3 px-4 py-3 ${
                          i === 0 ? 'bg-amber-50/60 dark:bg-amber-900/10' : ''
                        }`}>
                          <span className="text-xl w-7 text-center flex-shrink-0">{medals[i] ?? `${i + 1}`}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate ${
                              i === 0 ? 'text-amber-800 dark:text-amber-300' : 'text-foreground'
                            }`}>{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.meetingCount}번 함께 모임</p>
                          </div>
                          {i === 0 && (
                            <Star className="h-4 w-4 text-amber-400 fill-amber-400 flex-shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* 메뉴 섹션 */}
              <section>
                <p className="section-title">더보기</p>
                <div className="notion-card divide-y divide-border/30 overflow-hidden">
                  <button
                    onClick={() => router.push('/settings')}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                      <Settings className="h-4 w-4 text-primary" />
                    </div>
                    <span className="flex-1 text-sm font-medium text-left">설정</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                  </button>
                  <button
                    onClick={() => router.push('/friends')}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 flex-shrink-0">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                    </div>
                    <span className="flex-1 text-sm font-medium text-left">친구 목록</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                  </button>
                </div>
              </section>

              {/* 로그아웃 */}
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-medium text-destructive rounded-2xl border border-destructive/20 hover:bg-destructive/5 active:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                로그아웃
              </button>

              <p className="text-center text-[11px] text-muted-foreground/40 pb-2">맞춰봄 v1.0</p>
            </div>
          </div>
        </main>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
