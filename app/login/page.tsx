'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { API_BASE } from '@/lib/api';

function LoginPageContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirect = searchParams.get('redirect') || '/';

  useEffect(() => {
    if (!isLoading && user) {
      // 이미 로그인된 경우 redirect 경로로 이동
      router.replace(redirect);
    }
  }, [isLoading, user, router, redirect]);

  const kakaoLogin = () => {
    // 카카오 로그인 후 BE가 FRONTEND_ORIGIN으로 리다이렉트하므로
    // redirect 경로를 sessionStorage에 저장해두고 복귀 후 처리
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
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="h-5 w-5 rounded-full border-2 border-primary border-r-transparent animate-spin" />
            </div>
          ) : (
            <button
              onClick={kakaoLogin}
              className="w-full flex items-center justify-center gap-3 h-12 rounded-2xl bg-[#FEE500] text-[#3C1E1E] font-semibold text-sm hover:bg-[#FAD400] active:scale-[0.98] transition-all shadow-sm"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path fillRule="evenodd" clipRule="evenodd" d="M9 0C4.029 0 0 3.186 0 7.12c0 2.544 1.695 4.778 4.245 6.055L3.18 17.01a.375.375 0 0 0 .551.415L8.505 14.2c.162.01.325.016.495.016 4.971 0 9-3.187 9-7.12C18 3.186 13.971 0 9 0z" fill="#3C1E1E"/>
              </svg>
              카카오로 시작하기
            </button>
          )}

          {/* 초대 링크로 온 경우 안내 */}
          {redirect.includes('/meetings/join') && (
            <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 text-center">
              <p className="text-xs text-primary font-medium">
                로그인하면 바로 모임에 참여할 수 있어요
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground/60">
          로그인 시 서비스 이용약관에 동의하게 됩니다
        </p>
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
