// FE/src/api/calendar.ts
import type { CalendarEventDto } from '@/types/calendar';

const BE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8080';

export async function fetchEvents(range?: {
  start: string;
  end: string;
}): Promise<CalendarEventDto[]> {
  const qs = range
    ? `?start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(
        range.end
      )}`
    : '';
  const res = await fetch(`${BE}/api/calendar/events${qs}`, {
    credentials: 'include', // 세션 쿠키 포함
  });
  if (!res.ok) {
    // 인증 안 된 경우 BE가 로그인으로 리다이렉트 시키므로 FE에서 구글 로그인 시작
    if (res.status === 401 || res.status === 403) {
      // 백엔드 OAuth2 로그인 시작
      window.location.href = `${BE}/oauth2/authorization/google`;
      return [];
    }
    throw new Error(`Failed to fetch events: ${res.status}`);
  }
  return res.json();
}

export async function triggerSync(): Promise<void> {
  const res = await fetch(`${BE}/api/calendar/sync`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
}
