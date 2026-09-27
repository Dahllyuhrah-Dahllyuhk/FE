'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { agreeTerms } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

/**
 * 약관/개인정보 동의 게이트.
 * 로그인했지만 현재 약관 버전에 동의하지 않은 사용자에게만 1회 노출된다.
 * 동의 시 서버에 기록(POST /api/auth/terms) 후 사용자 정보를 갱신해 게이트를 닫는다.
 */
export function ConsentGate() {
  const { refreshUser, logout } = useAuth();
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleAgree = async () => {
    if (!checked || submitting) return;
    setSubmitting(true);
    try {
      await agreeTerms();
      await refreshUser();
    } catch {
      toast({ title: '동의 처리에 실패했습니다. 다시 시도해주세요.', variant: 'destructive' });
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold text-foreground">서비스 이용 동의</h1>
          <p className="text-sm text-muted-foreground">맞춰봄 이용을 위해 동의가 필요해요.</p>
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
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

        <button
          onClick={handleAgree}
          disabled={!checked || submitting}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? '처리 중...' : '동의하고 시작하기'}
        </button>

        <button
          onClick={logout}
          className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}
