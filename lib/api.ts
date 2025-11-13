// FE/lib/api.ts
import type { RawCalendarEvent } from '@/types/calendar';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

/**
 * 전체 기간 일정 조회
 * - 구글 연결 안 된 유저 → BE에서 [] 반환 (200 OK)
 * - 카카오 미로그인 → 401 → 예외
 * - 절대 여기에서 구글 로그인으로 리다이렉트하지 않는다
 */
export async function fetchAllCalendarEvents(): Promise<RawCalendarEvent[]> {
  const url = `${API_BASE}/api/calendar/events`;
  const res = await fetch(url, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('인증이 필요합니다. 다시 로그인 해 주세요.');
  }

  if (!res.ok) {
    throw new Error(`이벤트 조회 실패: ${res.status}`);
  }

  const ct = res.headers.get('content-type') || '';

  // 혹시 JSON 이 아니면 "일정 없음"으로 간주
  if (!ct.includes('application/json')) {
    return [];
  }

  const json = await res.json();
  return Array.isArray(json)
    ? json
    : Array.isArray(json?.events)
    ? json.events
    : [];
}

/**
 * 일정 생성
 * - 구글 계정이 연결되지 않은 상태라면 BE에서 401/403을 줄 수 있음
 * - 그 경우 FE는 에러를 던지고, 사용자는 "동기화" 버튼으로 구글 로그인 진행
 */
export async function createCalendarEvent(req: {
  title: string;
  description?: string;
  start: string;
  end: string;
  allDay?: boolean;
  timeZone?: string;
  color?: string;
}): Promise<any> {
  const url = `${API_BASE}/api/calendar/events`;
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(req),
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      '구글 캘린더가 연결되어 있지 않습니다. 먼저 동기화를 진행해 주세요.'
    );
  }

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to create event: ${res.status} - ${errorText}`);
  }

  return res.json();
}

export async function updateCalendarEvent(
  eventId: string,
  req: {
    title: string;
    description?: string;
    start: string;
    end: string;
    allDay?: boolean;
    timeZone?: string;
    color?: string;
  }
): Promise<any> {
  const url = `${API_BASE}/api/calendar/events/${eventId}`;
  const res = await fetch(url, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(req),
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      '구글 캘린더가 연결되어 있지 않습니다. 먼저 동기화를 진행해 주세요.'
    );
  }

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to update event: ${res.status} - ${errorText}`);
  }

  return res.json();
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const url = `${API_BASE}/api/calendar/events/${eventId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      '구글 캘린더가 연결되어 있지 않습니다. 먼저 동기화를 진행해 주세요.'
    );
  }

  // 구글 쪽에서 이미 삭제된 경우(410 Gone)는 성공으로 처리
  if (res.status === 410) {
    return;
  }

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to delete event: ${res.status} - ${errorText}`);
  }
}
