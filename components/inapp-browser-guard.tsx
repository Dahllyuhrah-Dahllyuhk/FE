'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

function detectInAppBrowser(): { isInApp: boolean; name: string } {
  if (typeof navigator === 'undefined') return { isInApp: false, name: '' };
  const ua = navigator.userAgent;
  if (/KAKAOTALK/i.test(ua)) return { isInApp: true, name: '카카오톡' };
  if (/NAVER/i.test(ua)) return { isInApp: true, name: '네이버' };
  if (/Instagram/i.test(ua)) return { isInApp: true, name: '인스타그램' };
  if (/FB_IAB|FBAN|FBAV/i.test(ua)) return { isInApp: true, name: '페이스북' };
  if (/Line\//i.test(ua)) return { isInApp: true, name: 'LINE' };
  return { isInApp: false, name: '' };
}

export function InAppBrowserGuard() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [inAppName, setInAppName] = useState('');
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 로그인 페이지는 자체 인앱 배너가 있으므로 스킵
    if (pathname === '/login') return;

    const info = detectInAppBrowser();
    if (!info.isInApp) return;

    const ua = navigator.userAgent;
    const isAndroid = /Android/.test(ua);
    const isIOSDevice = /iPhone|iPad|iPod/.test(ua);
    setInAppName(info.name);
    setIsIOS(isIOSDevice);

    if (isAndroid) {
      // Android: Intent URI로 Chrome 자동 전환 시도
      const url = window.location.href;
      const intentUrl = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
      window.location.href = intentUrl;
      // Intent 전환 실패 시(Chrome 미설치 등) 배너 표시
      setTimeout(() => setShow(true), 1500);
    } else {
      // iOS: 자동 전환 불가 → 배너로 안내
      setShow(true);
    }
  }, [pathname]);

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).then(() => {
        setUrlCopied(true);
        setTimeout(() => setUrlCopied(false), 3000);
      });
    }
  };

  if (!show) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] p-3">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800/40 p-4 space-y-3 shadow-lg max-w-lg mx-auto">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <span className="text-lg flex-shrink-0">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                {inAppName} 앱에서는 일부 기능이 제한됩니다
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                {isIOS ? 'Safari에서 열어 정상적으로 이용해 주세요.' : '외부 브라우저에서 이용해 주세요.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShow(false)}
            className="text-amber-600 hover:text-amber-800 text-lg leading-none flex-shrink-0 p-1"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <button
          onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors"
        >
          {urlCopied ? '주소 복사됨! Safari 주소창에 붙여넣기 해주세요' : '주소 복사하기'}
        </button>
        {isIOS && (
          <p className="text-[11px] text-amber-600 dark:text-amber-500 text-center">
            Safari 주소창에 붙여넣기 후 이용해 주세요
          </p>
        )}
      </div>
    </div>
  );
}
