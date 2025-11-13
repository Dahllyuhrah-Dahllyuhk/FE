// FE/src/api/calendar.ts
import type { RawCalendarEvent } from '@/types/calendar';

const BE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8080';

export async function fetchEvents(range?: {
  start: string;
  end: string;
}): Promise<RawCalendarEvent[]> {
  const qs = range
    ? `?start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(
        range.end
      )}`
    : '';

  const res = await fetch(`${BE}/api/calendar/events${qs}`, {
    credentials: 'include', // 세션 쿠키 포함
  });

  // 여기서는 **구글 로그인으로 절대 보내지 않는다**
  // - 카카오 미로그인: 401 → 상위 컴포넌트(ProtectedRoute)가 처리
  // - 기타 에러: 예외 던져서 화면에 에러 표시
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error('인증이 필요합니다. 다시 로그인 해 주세요.');
    }
    throw new Error(`Failed to fetch events: ${res.status}`);
  }

  return res.json();
}

// 과거 설계에서 사용하던 sync API.
// 지금 FE에서는 /api/calendar/sync 를 직접 호출하지 않으니
// 혹시라도 사용하면 에러만 던지도록 둔다.
export async function triggerSync(): Promise<void> {
  throw new Error(
    '동기화는 홈 화면의 "동기화" 버튼(구글 로그인)으로만 시작됩니다.'
  );
}
