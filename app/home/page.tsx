'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Check if user is logged in
    const checkAuth = async () => {
      try {
        const API_BASE =
          process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';
        const response = await fetch(`${API_BASE}/api/auth/me`, {
          credentials: 'include',
        });

        if (response.ok) {
          router.push('/home');
        }
      } catch (error) {
        console.log('User not logged in');
      }
    };

    checkAuth();
  }, [router]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <div className="container mx-auto px-4 py-16">
        <header className="flex justify-between items-center mb-20">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-2xl">📅</span>
            </div>
            <span className="text-2xl font-bold text-foreground">맞춰봄</span>
          </div>
          <Button asChild variant="outline">
            <Link href="/login">로그인</Link>
          </Button>
        </header>

        <main className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 text-balance">
              모두의 일정을
              <br />
              <span className="text-primary">한눈에 맞춰봄</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 text-pretty">
              친구들과 시간 조율이 어려우셨나요?{' '}
              <br className="hidden md:block" />
              맞춰봄으로 가능한 시간을 쉽게 찾아보세요
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-8">
                <Link href="/login">시작하기</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="text-lg px-8 bg-transparent"
              >
                <Link href="#features">더 알아보기</Link>
              </Button>
            </div>
          </div>

          <div id="features" className="grid md:grid-cols-3 gap-8 mb-20">
            <div className="bg-card p-8 rounded-2xl shadow-lg border border-border hover:shadow-xl transition-shadow">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-3xl">📆</span>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">
                간편한 일정 통합
              </h3>
              <p className="text-muted-foreground">
                구글 캘린더와 시간표를 자동으로 연동하여 내 일정을 한 곳에서
                관리하세요
              </p>
            </div>

            <div className="bg-card p-8 rounded-2xl shadow-lg border border-border hover:shadow-xl transition-shadow">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-3xl">👥</span>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">
                실시간 시간 조율
              </h3>
              <p className="text-muted-foreground">
                친구들과 함께 가능한 시간을 실시간으로 확인하고 최적의 시간을
                찾아보세요
              </p>
            </div>

            <div className="bg-card p-8 rounded-2xl shadow-lg border border-border hover:shadow-xl transition-shadow">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-3xl">⚡</span>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">
                빠르고 직관적
              </h3>
              <p className="text-muted-foreground">
                복잡한 절차 없이 클릭 몇 번으로 모임 일정을 생성하고 공유하세요
              </p>
            </div>
          </div>

          <div className="bg-card p-12 rounded-3xl shadow-xl border border-border text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              지금 바로 시작하세요
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              무료로 사용할 수 있습니다
            </p>
            <Button asChild size="lg" className="text-lg px-10">
              <Link href="/login">무료로 시작하기</Link>
            </Button>
          </div>
        </main>

        <footer className="mt-20 text-center text-sm text-muted-foreground">
          <p>© 2025 맞춰봄. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
