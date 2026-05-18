'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Users, Calendar, CalendarCheck, BarChart2, RefreshCw,
  Lock, TrendingUp, UserCheck, LogIn, ChevronLeft, ChevronRight,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

// ── 미니 막대 차트 ───────────────────────────────────────────────────
function MiniBarChart({ data, color = 'bg-primary' }: {
  data: { date: string; count: number }[];
  color?: string;
}) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end gap-0.5 h-14 w-full">
      {data.map((d, i) => {
        const pct = Math.max((d.count / max) * 100, d.count > 0 ? 4 : 0);
        const isToday = i === data.length - 1;
        return (
          <div
            key={d.date}
            className="flex-1 flex flex-col items-center justify-end gap-0.5 group relative"
            title={`${d.date}: ${d.count}건`}
          >
            <div
              className={`w-full rounded-sm transition-all ${isToday ? 'bg-primary' : color} opacity-70 group-hover:opacity-100`}
              style={{ height: `${pct}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

// ── 통계 카드 ──────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: number | string; sub?: string;
  icon: React.ElementType; accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-4 flex flex-col gap-2 ${
      accent ? 'bg-primary text-primary-foreground' : 'bg-white dark:bg-zinc-900 border border-border/60'
    }`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${accent ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
          {label}
        </span>
        <Icon className={`h-4 w-4 ${accent ? 'text-primary-foreground/60' : 'text-muted-foreground/50'}`} />
      </div>
      <div className={`text-3xl font-bold tabular-nums leading-none ${accent ? '' : 'text-foreground'}`}>
        {value}
      </div>
      {sub && (
        <span className={`text-[11px] ${accent ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
          {sub}
        </span>
      )}
    </div>
  );
}

// ── 뱃지 ──────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    PENDING:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    CONFIRMED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    CLOSED:    'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
  };
  const label: Record<string, string> = { PENDING: '조율 중', CONFIRMED: '확정됨', CLOSED: '종료됨' };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg[status] ?? 'bg-zinc-100 text-zinc-500'}`}>
      {label[status] ?? status}
    </span>
  );
}

// ── 메인 ──────────────────────────────────────────────────────────
export default function AdminPage() {
  const [secret, setSecret] = useState('');
  const [inputSecret, setInputSecret] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState(false);

  const [dashboard, setDashboard] = useState<Record<string, number> | null>(null);
  const [signupTrend, setSignupTrend] = useState<{ date: string; count: number }[]>([]);
  const [meetingTrend, setMeetingTrend] = useState<{ date: string; count: number }[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(0);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [meetingTotal, setMeetingTotal] = useState(0);
  const [meetingPage, setMeetingPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'overview' | 'users' | 'meetings'>('overview');

  const PAGE_SIZE = 15;

  const fetchAll = useCallback(async (s: string, up: number, mp: number) => {
    setLoading(true);
    try {
      const headers = { 'X-Admin-Secret': s };
      const [d, su, mt, u, m] = await Promise.all([
        fetch(`${API}/api/admin/dashboard`, { headers }).then(r => r.ok ? r.json() : null),
        fetch(`${API}/api/admin/stats/signups`, { headers }).then(r => r.ok ? r.json() : []),
        fetch(`${API}/api/admin/stats/meetings`, { headers }).then(r => r.ok ? r.json() : []),
        fetch(`${API}/api/admin/users?page=${up}&size=${PAGE_SIZE}`, { headers }).then(r => r.ok ? r.json() : null),
        fetch(`${API}/api/admin/meetings?page=${mp}&size=${PAGE_SIZE}`, { headers }).then(r => r.ok ? r.json() : null),
      ]);
      if (!d) { setAuthError(true); return; }
      setDashboard(d);
      setSignupTrend(su);
      setMeetingTrend(mt);
      if (u) { setUsers(u.users); setUserTotal(u.total); }
      if (m) { setMeetings(m.meetings); setMeetingTotal(m.total); }
      setAuthed(true);
      setAuthError(false);
    } finally { setLoading(false); }
  }, []);

  const handleLogin = () => {
    setSecret(inputSecret);
    fetchAll(inputSecret, 0, 0);
  };

  useEffect(() => {
    if (authed) fetchAll(secret, userPage, meetingPage);
  }, [userPage, meetingPage]); // eslint-disable-line

  const fmt = (v: number) => v?.toLocaleString() ?? '–';
  const fmtDate = (s: string | null) => s ? new Date(s).toLocaleDateString('ko-KR') : '–';

  // ── 로그인 화면 ──────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 p-8 shadow-lg space-y-6">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Lock className="h-7 w-7 text-primary" />
            </div>
            <div className="text-center">
              <h1 className="text-lg font-bold text-foreground">관리자 페이지</h1>
              <p className="text-sm text-muted-foreground mt-1">접근 코드를 입력하세요</p>
            </div>
          </div>
          <div className="space-y-3">
            <input
              type="password"
              placeholder="관리자 코드"
              value={inputSecret}
              onChange={e => setInputSecret(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            {authError && (
              <p className="text-xs text-destructive text-center">코드가 올바르지 않습니다</p>
            )}
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? '확인 중...' : '접속'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 메인 대시보드 ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border-b border-border/40">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-primary" />
            <span className="text-sm font-bold text-foreground">맞춰봄 관리자</span>
          </div>
          <button
            onClick={() => fetchAll(secret, userPage, meetingPage)}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* 탭 */}
        <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-fit">
          {(['overview', 'users', 'meetings'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab === t
                  ? 'bg-white dark:bg-zinc-900 text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'overview' ? '개요' : t === 'users' ? '사용자' : '모임'}
            </button>
          ))}
        </div>

        {/* ── 개요 탭 ── */}
        {tab === 'overview' && dashboard && (
          <div className="space-y-6">
            {/* 핵심 수치 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="전체 사용자" value={fmt(dashboard.totalUsers)}
                sub={`이번 주 +${dashboard.newUsersThisWeek}`} icon={Users} accent />
              <StatCard label="전체 모임" value={fmt(dashboard.totalMeetings)}
                sub={`조율 중 ${dashboard.pendingMeetings}`} icon={Calendar} />
              <StatCard label="구글 연동" value={`${dashboard.googleLinkedRate}%`}
                sub={`${fmt(dashboard.googleLinkedUsers)}명 연동`} icon={UserCheck} />
              <StatCard label="평균 참여자" value={dashboard.avgParticipantsPerMeeting}
                sub="모임당" icon={TrendingUp} />
            </div>

            {/* 모임 상태 분포 */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">모임 상태 분포</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: '조율 중', value: dashboard.pendingMeetings, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                  { label: '확정됨', value: dashboard.confirmedMeetings, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
                  { label: '종료됨', value: dashboard.closedMeetings, color: 'text-zinc-500', bg: 'bg-zinc-50 dark:bg-zinc-800' },
                ].map(item => (
                  <div key={item.label} className={`${item.bg} rounded-xl p-3 text-center`}>
                    <div className={`text-2xl font-bold ${item.color}`}>{fmt(item.value)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{item.label}</div>
                    <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {dashboard.totalMeetings > 0
                        ? `${Math.round(item.value / dashboard.totalMeetings * 100)}%`
                        : '0%'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 신규 가입 추이 */}
            {signupTrend.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <LogIn className="h-4 w-4 text-muted-foreground" />
                    신규 가입 추이 (최근 30일)
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    총 {signupTrend.reduce((s, d) => s + d.count, 0)}명
                  </span>
                </div>
                <MiniBarChart data={signupTrend} color="bg-blue-400" />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">{signupTrend[0]?.date}</span>
                  <span className="text-[10px] text-muted-foreground">{signupTrend[signupTrend.length - 1]?.date}</span>
                </div>
              </div>
            )}

            {/* 모임 생성 추이 */}
            {meetingTrend.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                    모임 생성 추이 (최근 30일)
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    총 {meetingTrend.reduce((s, d) => s + d.count, 0)}개
                  </span>
                </div>
                <MiniBarChart data={meetingTrend} color="bg-violet-400" />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">{meetingTrend[0]?.date}</span>
                  <span className="text-[10px] text-muted-foreground">{meetingTrend[meetingTrend.length - 1]?.date}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 사용자 탭 ── */}
        {tab === 'users' && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
              <h3 className="text-sm font-semibold">사용자 목록</h3>
              <span className="text-xs text-muted-foreground">총 {fmt(userTotal)}명</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 bg-zinc-50 dark:bg-zinc-800/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">닉네임</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">구글 연동</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">이메일</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">가입일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{u.nickname}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          u.googleLinked
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}>
                          {u.googleLinked ? '연동됨' : '미연동'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{u.googleEmail ?? '–'}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{fmtDate(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* 페이지네이션 */}
            <div className="px-5 py-3 border-t border-border/40 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {userPage * PAGE_SIZE + 1}–{Math.min((userPage + 1) * PAGE_SIZE, userTotal)} / {fmt(userTotal)}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setUserPage(p => Math.max(0, p - 1))}
                  disabled={userPage === 0}
                  className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setUserPage(p => p + 1)}
                  disabled={(userPage + 1) * PAGE_SIZE >= userTotal}
                  className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── 모임 탭 ── */}
        {tab === 'meetings' && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
              <h3 className="text-sm font-semibold">모임 목록</h3>
              <span className="text-xs text-muted-foreground">총 {fmt(meetingTotal)}개</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 bg-zinc-50 dark:bg-zinc-800/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">모임명</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">상태</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">참여자</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">확정일</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">생성일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {meetings.map(m => (
                    <tr key={m.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground max-w-[160px] truncate">{m.name}</td>
                      <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                      <td className="px-4 py-3 text-muted-foreground text-xs text-center">{m.participantCount}명</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{fmtDate(m.confirmedStart)}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{fmtDate(m.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* 페이지네이션 */}
            <div className="px-5 py-3 border-t border-border/40 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {meetingPage * PAGE_SIZE + 1}–{Math.min((meetingPage + 1) * PAGE_SIZE, meetingTotal)} / {fmt(meetingTotal)}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMeetingPage(p => Math.max(0, p - 1))}
                  disabled={meetingPage === 0}
                  className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setMeetingPage(p => p + 1)}
                  disabled={(meetingPage + 1) * PAGE_SIZE >= meetingTotal}
                  className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
