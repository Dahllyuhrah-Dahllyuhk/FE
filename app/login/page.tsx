'use client';

import { useEffect, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { API_BASE } from '@/lib/api';
import Link from 'next/link';

/** 인앱브라우저 여부 감지 */
function detectInAppBrowser(): { isInApp: boolean; name: string } {
  if (typeof navigator === 'undefined') return { isInApp: false, name: '' };
  const ua = navigator.userAgent;
  if (/NAVER/.test(ua)) return { isInApp: true, name: 'NAVER' };
  if (/KAKAOTALK/.test(ua)) return { isInApp: true, name: '카카오톡' };
  if (/Instagram/.test(ua)) return { isInApp: true, name: 'Instagram' };
  if (/FB_IAB|FBAN|FBAV/.test(ua)) return { isInApp: true, name: 'Facebook' };
  if (/Line\//.test(ua)) return { isInApp: true, name: 'LINE' };
  return { isInApp: false, name: '' };
}

/** 외부 브라우저로 현재 URL 열기 시도 */
function openInExternalBrowser() {
  const url = window.location.href;
  const ua = navigator.userAgent;

  // Android: intent scheme으로 Chrome 강제 오픈
  if (/Android/.test(ua)) {
    window.location.href = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
    return;
  }

  // iOS: 클립보드 복사 후 안내 (Safari는 intent 미지원)
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).catch(() => {});
  }
}

function LoginPageContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const [ageChecked, setAgeChecked] = useState(false);
  const [inAppInfo, setInAppInfo] = useState<{ isInApp: boolean; name: string }>({ isInApp: false, name: '' });
  const [urlCopied, setUrlCopied] = useState(false);

  useEffect(() => {
    setInAppInfo(detectInAppBrowser());
  }, []);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(redirect);
    }
  }, [isLoading, user, router, redirect]);

  const handleOpenExternal = () => {
    openInExternalBrowser();
    // Android intent 실패 대비: 클립보드 복사 안내
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href).then(() => {
          setUrlCopied(true);
          setTimeout(() => setUrlCopied(false), 3000);
        });
      }
    }
  };

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

        {/* 인앱브라우저 감지 시 안내 배너 */}
        {inAppInfo.isInApp && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800/40 p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <span className="text-lg flex-shrink-0">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  {inAppInfo.name} 앱에서는 구글 로그인이 제한됩니다
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                  구글 정책으로 인해 인앱 브라우저에서 구글 계정 연동이 불가능합니다.
                  카카오 로그인은 정상 이용 가능합니다.
                </p>
              </div>
            </div>
            <button
              onClick={handleOpenExternal}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors"
            >
              {urlCopied ? '주소가 복사됐어요! Safari에서 붙여넣기 해주세요' : '외부 브라우저로 열기'}
            </button>
            {/iPhone|iPad|iPod/.test(typeof navigator !== 'undefined' ? navigator.userAgent : '') && (
              <p className="text-[11px] text-amber-600 dark:text-amber-500 text-center">
                iOS: Safari 주소창에 붙여넣기 후 이용해주세요
              </p>
            )}
          </div>
        )}

        {/* 로그인 버튼 */}
        <div className="space-y-3">
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
              className="w-full flex items-center justify-center gap-2.5 h-12 rounded-xl bg-[#FEE500] text-[#191919] font-semibold text-sm hover:bg-[#F5DC00] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
