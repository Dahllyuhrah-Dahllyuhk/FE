'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // 로그인 상태 확인
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const API_BASE =
          process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          credentials: 'include',
        });

        if (res.ok) {
          // 이미 로그인되어 있으면 홈으로 리다이렉트
          router.replace('/');
        }
      } catch (error) {
        console.error('[v0] Auth check failed:', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleKakaoLogin = () => {
    setIsLoading(true);
    const API_BASE =
      process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';
    window.location.href = `${API_BASE}/oauth2/authorization/kakao`;
  };

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
          <p className="text-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary/10">
      <Card className="w-full max-w-md border-border bg-card p-8 shadow-lg">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold text-foreground">맞춰봄</h1>
            <p className="text-sm text-muted-foreground">
              캘린더에 로그인하세요
            </p>
          </div>

          {/* Login Button */}
          <Button
            onClick={handleKakaoLogin}
            disabled={isLoading}
            className="h-12 w-full bg-[#FEE500] text-[#191919] font-semibold hover:bg-[#FDD835] transition-colors"
          >
            {isLoading ? (
              <>
                <div className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#191919] border-r-transparent" />
                로그인 중...
              </>
            ) : (
              <>
                <svg
                  className="mr-2 h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                </svg>
                카카오로 로그인
              </>
            )}
          </Button>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground">
            로그인하면 서비스 이용약관에 동의하는 것으로 간주됩니다.
          </p>
        </div>
      </Card>
    </div>
  );
}
