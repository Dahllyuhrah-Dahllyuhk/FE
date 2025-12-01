'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ProtectedRoute } from '@/components/protected-route';
import { BottomNav } from '@/components/bottom-nav';
import { WeeklySchedule } from '@/components/weekly-schedule';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import {
  Calendar,
  Clock,
  Crown,
  Edit,
  LogOut,
  Settings,
  TrendingUp,
  Award,
} from 'lucide-react';

import { useAuth } from '@/context/auth-context';

type TopPartner = {
  userId: string;
  name: string;
  meetingCount: number;
};

export type TimeSlot = 'DAWN' | 'MORNING' | 'AFTERNOON' | 'EVENING';

export interface TimeSlotStat {
  slot: TimeSlot;
  count: number;
}

export function getTimeSlotLabel(slot: TimeSlot | null): string {
  if (!slot) return '데이터 없음';

  switch (slot) {
    case 'DAWN':
      return '새벽 (00:00 ~ 06:00)';
    case 'MORNING':
      return '아침 (06:00 ~ 12:00)';
    case 'AFTERNOON':
      return '오후 (12:00 ~ 18:00)';
    case 'EVENING':
      return '저녁 (18:00 ~ 24:00)';
    default:
      return '알 수 없음';
  }
}

export function getTimeSlotShortLabel(slot: TimeSlot): string {
  switch (slot) {
    case 'DAWN':
      return '새벽 (00:00 ~ 06:00)';
    case 'MORNING':
      return '오전 (06:00 ~ 12:00)';
    case 'AFTERNOON':
      return '오후 (12:00 ~ 18:00)';
    case 'EVENING':
      return '저녁 (18:00 ~ 24:00)';
  }
}

// 시간대 랭크 계산 (동률은 같은 순위)
function getTimeRank(index: number, stats: TimeSlotStat[]) {
  if (index === 0) return 1;
  let rank = 1;
  for (let i = 1; i <= index; i++) {
    if (stats[i].count !== stats[i - 1].count) {
      rank = i + 1;
    }
  }
  return rank;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  // ⭐ API 데이터 state
  const [stats, setStats] = useState<{
    upcomingCount: number;
    thisMonthMeetingCount: number;
    timeSlotStats: TimeSlotStat[];
  } | null>(null);

  const [partners, setPartners] = useState<TopPartner[] | null>(null);

  function getPartnerRank(index: number, partners: TopPartner[]) {
    if (index === 0) return 1; // 첫 번째는 무조건 1등

    let rank = 1;
    for (let i = 1; i <= index; i++) {
      if (partners[i].meetingCount !== partners[i - 1].meetingCount) {
        rank = i + 1;
      }
    }
    return rank;
  }

  // ⭐ 통계 API 불러오기
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE}/api/stats/dashboard`,
          {
            method: 'GET',
            credentials: 'include',
          }
        );

        if (!res.ok) {
          console.error('stats load failed');
          return;
        }

        const data = await res.json();
        setStats({
          upcomingCount: data.upcomingCount,
          thisMonthMeetingCount: data.thisMonthMeetingCount,
          timeSlotStats: data.timeSlotStats ?? [],
        });

        const res2 = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE}/api/stats/top-partners?limit=3`,
          { method: 'GET', credentials: 'include' }
        );
        if (res2.ok) {
          const partnersData = await res2.json();
          setPartners(partnersData);
        }
      } catch (err) {
        console.error(err);
      }
    }

    fetchStats();
  }, []);

  // 🔹 시간대 통계 파생 값 계산
  const timeStats: TimeSlotStat[] = stats?.timeSlotStats ?? [];

  const maxCount =
    timeStats.length > 0 ? Math.max(...timeStats.map((s) => s.count)) : 0;

  const topSlots: TimeSlot[] =
    maxCount > 0
      ? timeStats.filter((s) => s.count === maxCount).map((s) => s.slot)
      : [];

  const singleTopLabel =
    topSlots.length === 1 ? getTimeSlotLabel(topSlots[0]) : null;

  const multiTopLabel =
    topSlots.length > 1
      ? topSlots.map((s) => getTimeSlotShortLabel(s)).join(' / ')
      : null;

  // 리스트 표시는 랭킹 순으로 정렬
  const sortedTimeStats = [...timeStats].sort((a, b) => b.count - a.count);

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-background pb-16">
        <header className="border-b border-border bg-card px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground">내 정보</h1>
        </header>

        <main className="flex-1 overflow-y-auto p-4">
          <div className="space-y-6">
            {/* ---------------- 프로필 카드 ---------------- */}
            <Card className="overflow-hidden p-0">
              <div className="h-24 bg-gradient-to-r from-blue-500 to-purple-500" />
              <div className="relative px-6 pb-6">
                <div className="flex flex-col items-center">
                  <Avatar className="-mt-12 h-24 w-24 border-4 border-card">
                    <AvatarImage
                      src={
                        user?.profileImageUrl ||
                        '/placeholder.svg?height=96&width=96'
                      }
                    />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-2xl text-white">
                      {user?.nickname?.[0] || '김'}
                    </AvatarFallback>
                  </Avatar>

                  <h2 className="mt-4 text-2xl font-bold text-foreground">
                    {user?.nickname || '사용자'}
                  </h2>

                  <p className="text-muted-foreground">일반 회원</p>

                  <Badge variant="secondary" className="mt-2">
                    <Award className="mr-1 h-3 w-3" />
                    인증 회원
                  </Badge>

                  <Button className="mt-4 bg-transparent" variant="outline">
                    <Edit className="mr-2 h-4 w-4" />
                    프로필 편집
                  </Button>
                </div>
              </div>
            </Card>

            {/* ---------------- 주간 일정 ---------------- */}
            <WeeklySchedule />

            {/* ---------------- 활동 통계 ---------------- */}
            <Card className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">
                  활동 통계
                </h3>
              </div>

              {stats ? (
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">
                      {stats.thisMonthMeetingCount}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      이번 달 참여한 모임 수
                    </p>
                  </div>

                  <Separator orientation="vertical" className="mx-auto h-12" />

                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">
                      {stats.upcomingCount}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      예정된 모임
                    </p>
                  </div>

                  <Separator orientation="vertical" className="mx-auto h-12" />
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  통계 불러오는 중...
                </div>
              )}
            </Card>

            {/* ---------------- 가장 자주 만나는 시간대 (리스트형 + 1등 왕관) ---------------- */}
            <Card className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">
                  가장 자주 만나는 시간대
                </h3>
              </div>

              {stats && timeStats.length > 0 ? (
                <>
                  {topSlots.length === 1 ? (
                    <p className="mb-4 text-sm text-muted-foreground">
                      당신은 주로{' '}
                      <span className="font-semibold text-foreground">
                        {singleTopLabel}
                      </span>
                      에 모임을 잡고 있어요.
                    </p>
                  ) : topSlots.length > 1 ? (
                    <p className="mb-4 text-sm text-muted-foreground">
                      당신은{' '}
                      <span className="font-semibold text-foreground">
                        {multiTopLabel}
                      </span>
                      {' '}시간대에 골고루 모임을 잡고 있어요.
                    </p>
                  ) : (
                    <p className="mb-4 text-sm text-muted-foreground">
                      아직 시간대 패턴을 알 수 있을 만큼 데이터가 부족해요.
                    </p>
                  )}

                  <div className="space-y-3">
                    {sortedTimeStats.map(({ slot, count }, idx) => {
                      const rank = getTimeRank(idx, sortedTimeStats);
                      const isTop1 = rank === 1;

                      return (
                        <div
                          key={slot}
                          className={
                            isTop1
                              ? 'flex items-center justify-between rounded-xl border border-yellow-300/70 bg-yellow-50/70 px-4 py-3 shadow-sm'
                              : 'flex items-center justify-between rounded-lg border px-3 py-2'
                          }
                        >
                          <div className="flex items-center gap-3">
                            {isTop1 ? (
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-400">
                                <Crown
                                  className="h-5 w-5 translate-y-[0.5px] text-yellow-900"
                                  strokeWidth={2}
                                />
                              </div>
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}

                            <div>
                              <p
                                className={
                                  isTop1
                                    ? 'text-sm font-bold text-yellow-900'
                                    : 'text-sm font-semibold text-foreground'
                                }
                              >
                                {getTimeSlotShortLabel(slot)}
                              </p>
                              <p
                                className={
                                  isTop1
                                    ? 'text-xs text-yellow-800/90'
                                    : 'text-xs text-muted-foreground'
                                }
                              >
                                총 {count}회 모임
                              </p>
                            </div>
                          </div>

                          {isTop1 ? (
                            <Badge className="bg-yellow-400 text-xs font-semibold text-yellow-900">
                              TOP {rank}
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="text-[11px]"
                            >
                              TOP {rank}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  아직 확정된 모임이 없어 시간대 통계를 만들 수 없어요.
                </p>
              )}
            </Card>

            {/* ---------------- 가장 많이 만난 사람 ---------------- */}
            <Card className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">
                  가장 많이 만난 사람
                </h3>
              </div>

              {!partners && (
                <p className="text-sm text-muted-foreground">불러오는 중...</p>
              )}

              {partners?.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  데이터가 없습니다.
                </p>
              )}

              {partners && partners.length > 0 && (
                <div className="space-y-3">
                  {partners.map((p, idx) => {
                    const rank = getPartnerRank(idx, partners);
                    const isTop1 = rank === 1;

                    if (isTop1) {
                      // 1등 - 강조 카드
                      return (
                        <div
                          key={p.userId}
                          className="flex items-center justify-between rounded-xl border border-yellow-300/70 bg-yellow-50/70 px-4 py-3 shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-400">
                              <Crown
                                className="h-5 w-5 translate-y-[0.5px] text-yellow-900"
                                strokeWidth={2}
                              />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-yellow-900">
                                {p.name}
                              </p>
                              <p className="text-xs text-yellow-800/90">
                                최다 만남 · 총 {p.meetingCount}회 함께 참석
                              </p>
                            </div>
                          </div>

                          <Badge className="bg-yellow-400 text-xs font-semibold text-yellow-900">
                            TOP {rank}
                          </Badge>
                        </div>
                      );
                    }

                    // 나머지 TOP 2, 3 …
                    return (
                      <div
                        key={p.userId}
                        className="flex items-center justify-between rounded-lg border px-3 py-2"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{p.name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {p.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              총 {p.meetingCount}회 함께 참석
                            </p>
                          </div>
                        </div>

                        <Badge variant="secondary" className="text-[11px]">
                          TOP {rank}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* ---------------- 가입일 ---------------- */}
            <Card className="p-4">
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">가입일</p>
                  <p className="font-medium text-foreground">
                    {user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString()
                      : '---'}
                  </p>
                </div>
              </div>
            </Card>

            {/* ---------------- 설정 / 로그아웃 ---------------- */}
            <div className="space-y-3">
              <Button
                onClick={() => router.push('/settings')}
                variant="outline"
                className="w-full"
              >
                <Settings className="mr-2 h-4 w-4" />
                설정
              </Button>

              <Button onClick={logout} variant="destructive" className="w-full">
                <LogOut className="mr-2 h-4 w-4" />
                로그아웃
              </Button>
            </div>
          </div>
        </main>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
