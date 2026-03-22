'use client';

import { useEffect, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { API_BASE } from '@/lib/api';
import Link from 'next/link';

function LoginPageContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const [ageChecked, setAgeChecked] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(redirect);
    }
  }, [isLoading, user, router, redirect]);

  const kakaoLogin = () => {
    if (!ageChecked) return;
    if (redirect && redirect !== '/') {
      sessionStorage.setItem('login_redirect', redirect);
    }
    window.location.href = `${API_BASE}/oauth2/authorization/kakao`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-8">
        {/* 로고 영역 */}
        <div className="flex flex-col items-center gap-3">
          <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center">
            <span className="text-3xl">📅</span>
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-foreground">맞춰봄</h1>
            <p className="text-sm text-muted-foreground">일정을 함께 조율해요</p>
          </div>
        </div>

        {/* 로그인 버튼 */}
        <div className="space-y-3">
          {/* 만 14세 이상 확인 */}
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={ageChecked}
              onChange={(e) => setAgeChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border accent-primary cursor-pointer flex-shrink-0"
            />
            <span className="text-xs text-muted-foreground leading-relaxed">
              만 14세 이상이며{' '}
              <Link href="/terms" className="underline hover:text-foreground">이용약관</Link>
              {' '}및{' '}
              <Link href="/privacy" className="underline hover:text-foreground">개인정보처리방침</Link>
              에 동의합니다.
            </span>
          </label>

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="h-5 w-5 rounded-full border-2 border-primary border-r-transparent animate-spin" />
            </div>
          ) : (
            <button
              onClick={kakaoLogin}
              disabled={!ageChecked}
              className="w-full disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <img
                src="/kakao_login.png"
                alt="카카오로 시작하기"
                className="w-full h-auto"
              />
            </button>
          )}

          {redirect.includes('/meetings/join') && (
            <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 text-center">
              <p className="text-xs text-primary font-medium">
                로그인하면 바로 모임에 참여할 수 있어요
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-r-transparent animate-spin" />
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}
