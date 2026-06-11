'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { API_BASE } from '@/lib/api';

function LoginPageContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(redirect);
    }
  }, [isLoading, user, router, redirect]);

  const kakaoLogin = () => {
    if (redirect && redirect !== '/') {
      localStorage.setItem('login_redirect', redirect);
    }
    window.location.href = `${API_BASE}/oauth2/authorization/kakao`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-8">
        {/* 로고 */}
        <div className="flex flex-col items-center gap-3">
          <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center">
            <span className="text-3xl">📅</span>
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-foreground">맞춰봄</h1>
            <p className="text-sm text-muted-foreground">일정을 함께 조율해요</p>
          </div>
        </div>

        {/* 로그인 */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="h-5 w-5 rounded-full border-2 border-primary border-r-transparent animate-spin" />
            </div>
          ) : (
            <button
              onClick={kakaoLogin}
              className="w-full flex items-center justify-center gap-2.5 h-12 rounded-xl bg-[#FEE500] text-[#191919] font-semibold text-sm hover:bg-[#F5DC00] transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M9 1C4.58172 1 1 3.80568 1 7.25C1 9.37033 2.27027 11.2412 4.22147 12.3836L3.39663 15.5547C3.33749 15.7784 3.59007 15.9547 3.78441 15.8237L7.5597 13.3938C8.02879 13.4632 8.51025 13.5 9 13.5C13.4183 13.5 17 10.6943 17 7.25C17 3.80568 13.4183 1 9 1Z" fill="#191919"/>
              </svg>
              카카오로 시작하기
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
