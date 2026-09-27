'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * 라우트 변경 시 스크롤을 맨 위로 리셋한다.
 * 홈(`/`)은 캘린더가 현재 달로 자체 스크롤하므로 제외한다.
 * (홈 캘린더가 window를 아래로 스크롤해둔 상태가 다음 탭으로 이어지는 문제 방지)
 */
export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/') return;
    window.scrollTo(0, 0);
    document.querySelectorAll('main').forEach((m) => m.scrollTo({ top: 0 }));
  }, [pathname]);

  return null;
}
