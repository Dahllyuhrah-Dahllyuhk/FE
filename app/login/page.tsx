'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/auth-context';
import { API_BASE } from '@/lib/api';

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      // 이미 로그인된 경우 홈으로
      router.replace('/');
    }
  }, [isLoading, user, router]);

  const kakaoLogin = () => {
    window.location.href = `${API_BASE}/oauth2/authorization/kakao`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            맞춰봄 캘린더 로그인
          </CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            카카오 계정으로 로그인하세요.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-center text-sm text-muted-foreground">
              로그인 상태 확인 중...
            </p>
          ) : (
            <Button
              variant="default"
              className="w-full bg-[#FEE500] text-black hover:bg-[#FAD400]"
              onClick={kakaoLogin}
            >
              카카오로 로그인
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
