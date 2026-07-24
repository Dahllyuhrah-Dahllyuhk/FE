'use client';

import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { CalendarCheck, Users, RefreshCw } from 'lucide-react';

const FEATURES = [
  {
    icon: Users,
    title: '시간 조율 자동화',
    desc: '참여자들의 빈 시간을 모아 겹치는 시간대를 찾아, 모두가 되는 약속 시간을 제안합니다.',
  },
  {
    icon: CalendarCheck,
    title: 'Google 캘린더 연동',
    desc: '확정된 약속을 내 Google 캘린더에 자동으로 등록하고, 변경·취소도 함께 반영합니다.',
  },
  {
    icon: RefreshCw,
    title: '실시간 일정 관리',
    desc: '내 일정을 캘린더로 한눈에 보고, 새 약속을 바로 만들고 관리합니다.',
  },
];

/**
 * 로그아웃 상태에서 보여주는 공개 랜딩 페이지.
 * 로그인 없이 접근 가능해야 하는 서비스 소개 홈페이지(Google OAuth 검증 요건).
 */
export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <span className="text-sm font-semibold tracking-tight">맞춰봄</span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/login"
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              로그인
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-4 py-20 sm:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              여러 사람의 시간을 맞추는 가장 쉬운 방법
            </div>
            <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              약속 시간, 맞춰봄이 대신 맞춰드릴게요
            </h1>
            <p className="mt-4 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
              참여자들의 빈 시간을 모아 겹치는 시간대를 찾고, 확정된 약속은 Google 캘린더에
              자동으로 반영합니다. 일정 조율에 드는 왕복 메시지를 없애세요.
            </p>
            <div className="mt-8 flex items-center justify-center">
              <Link
                href="/login"
                className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                시작하기
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-20">
          <div className="grid gap-4 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-card p-5">
                <f.icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
                <h3 className="mt-3 text-sm font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>

          <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-relaxed text-muted-foreground">
            맞춰봄은 Google 캘린더의 <span className="text-foreground">일정(events)</span> 정보만 사용해
            약속을 등록·수정·삭제하고 가능한 시간을 계산합니다. 캘린더 자체나 공유 설정은 변경하지 않습니다.
          </p>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row">
          <span>© 2026 맞춰봄</span>
          <nav className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-foreground">이용약관</Link>
            <Link href="/privacy" className="hover:text-foreground">개인정보처리방침</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
