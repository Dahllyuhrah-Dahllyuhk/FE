'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

const STEPS = [
  {
    emoji: '📅',
    title: '구글 캘린더 연동',
    desc: '설정에서 구글 계정을 연동하면 내 캘린더 일정이 자동으로 불러와집니다. 별도 입력 없이 바쁜 시간이 자동 반영돼요.',
  },
  {
    emoji: '🤝',
    title: '모임 만들기',
    desc: '모임 탭에서 새 모임을 만들고 날짜 범위를 지정하세요. 초대 코드나 링크를 친구에게 공유하면 참여 요청을 보낼 수 있어요.',
  },
  {
    emoji: '🗓️',
    title: '가능한 시간 선택',
    desc: '참여자 각자가 가능한 날짜와 시간대를 선택해요. 구글 캘린더와 시간표가 연동된 경우 자동으로 채워져 편리해요.',
  },
  {
    emoji: '✅',
    title: '최적 시간 확정',
    desc: '모든 참여자가 가능한 시간이 한눈에 표시됩니다. 호스트가 최적 시간을 선택해 모임을 확정하면 끝!',
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // 이미 방문한 적 있으면 로그인 체크 후 캘린더로 바로 이동
    const hasVisited = localStorage.getItem('hasVisited');
    if (hasVisited) {
      const checkAuth = async () => {
        try {
          const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';
          const response = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
          if (response.ok) {
            router.replace('/');
          }
        } catch {
          // 미로그인 — 랜딩 그대로 표시
        }
      };
      checkAuth();
    } else {
      // 첫 방문 기록
      localStorage.setItem('hasVisited', '1');
    }
  }, [router]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <div className="container mx-auto px-4 py-16 max-w-3xl">

        {/* 헤더 */}
        <header className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-xl">📅</span>
            </div>
            <span className="text-xl font-bold text-foreground">맞춰봄</span>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/login">로그인</Link>
          </Button>
        </header>

        {/* 히어로 */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            친구들과 일정 조율,<br />
            <span className="text-primary">맞춰봄</span>으로 쉽게
          </h1>
          <p className="text-base text-muted-foreground mb-8 max-w-md mx-auto">
            구글 캘린더를 연동하고 모임을 만들면, 모두가 가능한 시간을 자동으로 찾아드려요.
          </p>
          <Button asChild size="lg" className="px-10">
            <Link href="/login">무료로 시작하기</Link>
          </Button>
        </div>

        {/* 사용법 스텝 */}
        <section className="mb-16">
          <h2 className="text-lg font-semibold text-center text-foreground mb-8">이렇게 사용해요</h2>
          <div className="space-y-4">
            {STEPS.map((step, i) => (
              <div key={i} className="flex gap-4 bg-card rounded-2xl border border-border p-5 shadow-sm">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
                  {step.emoji}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      STEP {i + 1}
                    </span>
                    <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 주요 기능 */}
        <section className="mb-16">
          <h2 className="text-lg font-semibold text-center text-foreground mb-6">주요 기능</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { emoji: '🔄', title: '실시간 동기화', desc: '구글 캘린더 변경이 즉시 반영' },
              { emoji: '👥', title: '친구 관리', desc: '초대 코드로 손쉽게 친구 추가' },
              { emoji: '📊', title: '가능 시간 시각화', desc: '참여자별 가능 시간 한눈에 확인' },
              { emoji: '📲', title: '모바일 최적화', desc: '스마트폰에서도 편리하게' },
            ].map((f, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border p-4 shadow-sm">
                <span className="text-2xl mb-2 block">{f.emoji}</span>
                <p className="text-sm font-semibold text-foreground mb-0.5">{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="bg-primary rounded-3xl p-8 text-center text-primary-foreground mb-12">
          <h2 className="text-xl font-bold mb-2">지금 바로 시작해보세요</h2>
          <p className="text-sm opacity-80 mb-6">무료, 가입 즉시 사용 가능</p>
          <Button asChild variant="secondary" size="lg" className="px-10">
            <Link href="/login">카카오로 시작하기</Link>
          </Button>
        </div>

        <footer className="text-center text-xs text-muted-foreground">
          <p>© 2025 맞춰봄. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
