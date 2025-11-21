// FE/lib/api.ts
import type { RawCalendarEvent } from '@/types/calendar';

// ✅ 다른 파일에서 import { API_BASE } 할 수 있도록 export 추가
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

/**
 * 공통 fetch 래퍼
 * - credentials: 'include' 로 쿠키(JWT) 항상 포함
 * - 401이면 그대로 throw 해서 프론트에서 로그인 페이지로 보내도록 처리
 */
async function apiFetch(input: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${input}`, {
    credentials: 'include',
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (res.status === 401) {
    // 카카오 미로그인 등 → 프론트에서 처리
    throw new Error('UNAUTHORIZED');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('API error', res.status, text);
    throw new Error(`API_ERROR_${res.status}`);
  }

  return res;
}

/**
 * 전체 기간 일정 조회
 * - BE: GET /api/calendar/all
 * - 구글 연결 안 된 유저는 [] 반환
 */
export async function fetchAllCalendarEvents(): Promise<RawCalendarEvent[]> {
  // 백엔드에서 실제로 구현되어 있는 GET 엔드포인트로 맞추기
  // 예: GET /api/calendar/events
  const res = await apiFetch('/api/calendar/events', {
    method: 'GET',
  });
  return res.json();
}

/**
 * 기존: 특정 기간만 조회하던 함수
 * 지금은 혹시 다른 데서 쓰고 있을 수 있으니 남겨두되,
 * 내부 구현은 all 조회 재사용 (필요하면 프론트에서 필터링)
 */
export async function fetchCalendarEvents(): Promise<RawCalendarEvent[]> {
  return fetchAllCalendarEvents();
}

/**
 * 일정 생성
 */
export async function createCalendarEvent(body: {
  title?: string;
  description?: string;
  start: string;
  end: string;
  allDay?: boolean;
  color?: string;
}): Promise<RawCalendarEvent> {
  const res = await apiFetch('/api/calendar/events', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.json();
}

/**
 * 일정 수정
 */
export async function updateCalendarEvent(
  id: string,
  body: {
    title?: string;
    description?: string;
    start?: string;
    end?: string;
    allDay?: boolean;
    color?: string;
  }
): Promise<RawCalendarEvent> {
  const res = await apiFetch(`/api/calendar/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return res.json();
}

/**
 * 일정 삭제
 */
export async function deleteCalendarEvent(id: string): Promise<void> {
  await apiFetch(`/api/calendar/events/${id}`, {
    method: 'DELETE',
  });
}

// 친구 DTO (백엔드 FriendDto에 맞게 사용)
export type FriendDto = {
  id: string;
  nickname: string;
  profileImageUrl?: string | null;
};

// 초대코드 응답 타입
export type InviteCodeResponse = {
  ownerUserId: string;
  code: string;
};

/**
 * 내 초대코드 조회
 * GET /api/friends/invite-code
 */
export async function fetchMyInviteCode(): Promise<InviteCodeResponse> {
  const res = await apiFetch('/api/friends/invite-code', {
    method: 'GET',
  });
  return res.json();
}

/**
 * 내 친구 목록 조회
 * GET /api/friends
 */
export async function fetchFriends(): Promise<FriendDto[]> {
  const res = await apiFetch('/api/friends', {
    method: 'GET',
  });
  return res.json();
}

/**
 * 초대코드로 친구 추가
 * POST /api/friends/addFriend
 * body: { code: string }
 */
export async function addFriendByCode(code: string): Promise<FriendDto> {
  const res = await fetch(`${API_BASE}/api/friends/addFriend`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });

  if (res.ok) {
    return res.json(); // FriendDto
  }

  // 에러 메시지는 plain text로 옴 → 그대로 읽기
  const message = await res.text();

  // status별로 throw
  if (res.status === 400) {
    throw new Error(message || '잘못된 요청입니다.');
  }
  if (res.status === 404) {
    throw new Error('친구를 찾을 수 없습니다.');
  }
  if (res.status === 409) {
    throw new Error('이미 친구입니다.');
  }

  throw new Error(message || '친구 추가 중 알 수 없는 오류가 발생했습니다.');
}

export async function deleteFriend(friendId: string): Promise<void> {
  await apiFetch(`/api/friends/${friendId}`, {
    method: 'DELETE',
  });
}

