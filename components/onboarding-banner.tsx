'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, X, Calendar } from 'lucide-react';
import { API_BASE, prepareGoogleLink } from '@/lib/api';

const STORAGE_KEY = 'onboarding_dismissed';

export function OnboardingBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  };

  const handleSync = async () => {
    dismiss();
    const base = API_BASE || 'http://localhost:8080';
    // OAuth 리다이렉트 후 SecurityContext가 Google 사용자로 교체되므로
    // 세션에 userId를 미리 저장해 두어야 handleGoogleLogin이 userId를 식별할 수 있음
    await prepareGoogleLink();
    window.location.href = `${base}/oauth2/authorization/google`;
  };

  if (!visible) return null;

  return (
    <div className="mx-2 mt-2 mb-0 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-start gap-3">
      <Calendar className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">구글 캘린더를 연동해보세요</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          내 일정을 자동으로 가져와 모임 조율이 더 편해집니다.
        </p>
        <button
          onClick={handleSync}
          className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <RefreshCw className="h-3 w-3" />
          지금 연동하기
        </button>
      </div>
      <button
        onClick={dismiss}
        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="닫기"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
