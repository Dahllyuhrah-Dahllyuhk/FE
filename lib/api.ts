// FE/lib/api.ts
import type { RawCalendarEvent } from '@/types/calendar';
import type {
  Meeting,
  MeetingCreateRequest,
  MeetingUpdateRequest,
  ParticipantSettingsUpdateRequest,
  AvailableSlot,
  ParticipantTimeStatus,
  DailyCountDto,
  MeetingStatusUpdateRequest,
} from '@/types/meeting';

// ✨ FriendDto 정의 (API 파일 내부에 위치)
export type FriendDto = {
  id: string;
  nickname: string;
  profileImageUrl?: string | null;
};

// ✨ 수정: 슬롯 번호 기반의 새로운 요청 페이로드 타입
export type AvailabilitySlotUpdatePayload = {
  date: string; // "YYYY-MM-DD"
  slots: number[]; // 슬롯 번호 배열 (예: [18, 19, 20])
  status: 'POSSIBLE' | 'IMPOSSIBLE';
};

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

// ... (fetchAllCalendarEvents, createCalendarEvent 등 기존 함수 생략) ...
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
 * - BE: GET /api/calendar/events
 */
export async function fetchAllCalendarEvents(): Promise<RawCalendarEvent[]> {
  const res = await apiFetch('/api/calendar/events', {
    method: 'GET',
  });
  return res.json();
}

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

  const message = await res.text();

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

/* ===== Meeting APIs ===== */

/**
 * 모임 생성
 * POST /api/meetings
 */
export async function createMeeting(
  body: MeetingCreateRequest
): Promise<Meeting> {
  const res = await apiFetch('/api/meetings', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.json();
}

/**
 * 모임 목록 조회
 * GET /api/meetings
 */
export async function fetchMeetings(): Promise<Meeting[]> {
  const res = await apiFetch('/api/meetings', {
    method: 'GET',
  });
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * 모임 상세 조회
 * GET /api/meetings/{id}
 */
export async function fetchMeeting(id: string): Promise<Meeting> {
  const res = await apiFetch(`/api/meetings/${id}`, {
    method: 'GET',
  });
  return res.json();
}

/**
 * 최종 가용 시간 조회
 * GET /api/meetings/{id}/available-slots
 */
export async function fetchAvailableSlots(
  id: string
): Promise<AvailableSlot[]> {
  const res = await apiFetch(`/api/meetings/${id}/available-slots`, {
    method: 'GET',
  });
  return res.json();
}

/**
 * 날짜별 가용 인원 집계 조회 (월별 캘린더 하이라이트 용)
 * GET /api/meetings/{id}/daily-availability
 */
export async function fetchDailyAvailability(
  id: string
): Promise<Record<string, DailyCountDto>> {
  const res = await apiFetch(`/api/meetings/${id}/daily-availability`, {
    method: 'GET',
  });
  return res.json();
}

/**
 * 참여자 응답 업데이트
 * PUT /api/meetings/{id}/status
 */
export async function updateParticipantStatus(
  id: string,
  statusList: ParticipantTimeStatus[]
): Promise<Meeting> {
  const res = await apiFetch(`/api/meetings/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify(statusList),
  });
  return res.json();
}

/**
 * ✨ 수정: 슬롯 번호 기반의 PATCH API 호출
 * PATCH /api/meetings/{meetingId}/status
 */
export async function patchParticipantAvailability(
  meetingId: string,
  updates: AvailabilitySlotUpdatePayload[] // ✨ 타입 변경
): Promise<Meeting> {
  // 백엔드 엔드포인트: PATCH /api/meetings/{meetingId}/status
  const res = await apiFetch(`/api/meetings/${meetingId}/status`, {
    method: 'PATCH',
    // 백엔드는 Instant 범위를 기대하므로, 이 요청을 슬롯 기반으로 변경해야 합니다.
    // 하지만 현재 백엔드는 슬롯을 기대하도록 수정했으므로, JSON.stringify(updates) 그대로 전송합니다.
    body: JSON.stringify(updates),
  });
  return res.json();
}

/**
 * 모임 수정 (Host only)
 * PUT /api/meetings/{id}
 */
export async function updateMeeting(
  id: string,
  body: MeetingUpdateRequest
): Promise<Meeting> {
  const res = await apiFetch(`/api/meetings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return res.json();
}

/**
 * 모임 삭제 (Host only)
 * DELETE /api/meetings/{id}
 */
export async function deleteMeeting(id: string): Promise<void> {
  await apiFetch(`/api/meetings/${id}`, {
    method: 'DELETE',
  });
}

/**
 * 참여자 설정 수정 (timetable/calendar 반영 여부)
 * PUT /api/meetings/{meetingId}/settings
 */
export async function updateParticipantSettings(
  meetingId: string,
  body: ParticipantSettingsUpdateRequest
): Promise<Meeting> {
  const res = await apiFetch(`/api/meetings/${meetingId}/settings`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return res.json();
}

/**
 * 모임 초대 수락
 * POST /api/meetings/{meetingId}/accept
 */
export async function acceptMeetingInvitation(
  meetingId: string
): Promise<Meeting> {
  const res = await apiFetch(`/api/meetings/${meetingId}/accept`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return res.json();
}

/**
 * 모임에 사용자 초대
 * POST /api/meetings/{meetingId}/invite
 */
export async function inviteUserToMeeting(
  meetingId: string,
  email: string
): Promise<Meeting> {
  const res = await apiFetch(`/api/meetings/${meetingId}/invite`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  return res.json();
}

/**
 * 모임 상태 변경 (Host only)
 * PATCH /api/meetings/{id}/state
 */
export async function updateMeetingState(
  id: string,
  body: MeetingStatusUpdateRequest
): Promise<Meeting> {
  const res = await apiFetch(`/api/meetings/${id}/state`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return res.json();
}
