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

// FriendDto
export type FriendDto = {
  id: string;
  nickname: string;
  profileImageUrl?: string | null;
};

// 슬롯 업데이트 페이로드
export type AvailabilitySlotUpdatePayload = {
  date: string; // ISO 형식 (예: "2025-11-25T00:00:00.000Z")
  slots: number[];
  status: 'POSSIBLE' | 'IMPOSSIBLE';
};

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

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

/* ===================== Calendar APIs ===================== */

export async function fetchAllCalendarEvents(): Promise<RawCalendarEvent[]> {
  const res = await apiFetch('/api/calendar/events', { method: 'GET' });
  return res.json();
}

export async function fetchCalendarEvents(): Promise<RawCalendarEvent[]> {
  return fetchAllCalendarEvents();
}

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

export async function deleteCalendarEvent(id: string): Promise<void> {
  await apiFetch(`/api/calendar/events/${id}`, { method: 'DELETE' });
}

/* ===================== Friends APIs ===================== */

export type InviteCodeResponse = {
  ownerUserId: string;
  code: string;
};

export async function fetchMyInviteCode(): Promise<InviteCodeResponse> {
  const res = await apiFetch('/api/friends/invite-code', { method: 'GET' });
  return res.json();
}

export async function fetchFriends(): Promise<FriendDto[]> {
  const res = await apiFetch('/api/friends', { method: 'GET' });
  return res.json();
}

export async function addFriendByCode(code: string): Promise<FriendDto> {
  const res = await fetch(`${API_BASE}/api/friends/addFriend`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  if (res.ok) return res.json();

  const msg = await res.text();
  if (res.status === 400) throw new Error(msg || '잘못된 요청입니다.');
  if (res.status === 404) throw new Error('친구를 찾을 수 없습니다.');
  if (res.status === 409) throw new Error('이미 친구입니다.');
  throw new Error(msg || '알 수 없는 오류');
}

export async function deleteFriend(friendId: string): Promise<void> {
  await apiFetch(`/api/friends/${friendId}`, { method: 'DELETE' });
}

/* ===================== Meeting APIs ===================== */

export async function createMeeting(
  body: MeetingCreateRequest
): Promise<Meeting> {
  const res = await apiFetch('/api/meetings', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function fetchMeetings(): Promise<Meeting[]> {
  const res = await apiFetch('/api/meetings', { method: 'GET' });
  return res.json();
}

export async function fetchMeeting(id: string): Promise<Meeting> {
  const res = await apiFetch(`/api/meetings/${id}`, { method: 'GET' });
  return res.json();
}

export async function fetchAvailableSlots(
  id: string
): Promise<AvailableSlot[]> {
  const res = await apiFetch(`/api/meetings/${id}/available-slots`, {
    method: 'GET',
  });
  return res.json();
}

export async function fetchDailyAvailability(
  id: string
): Promise<Record<string, DailyCountDto>> {
  const res = await apiFetch(`/api/meetings/${id}/daily-availability`, {
    method: 'GET',
  });
  return res.json();
}

/**
 * PUT 전체 업데이트
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
 * PATCH 슬롯 부분 업데이트
 * (프론트 호출부: meetingId, userId, payload)
 */
export async function patchParticipantAvailability(
  meetingId: string,
  updates: AvailabilitySlotUpdatePayload[]
): Promise<Meeting> {
  const res = await apiFetch(`/api/meetings/${meetingId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return res.json();
}

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

export async function deleteMeeting(id: string): Promise<void> {
  await apiFetch(`/api/meetings/${id}`, { method: 'DELETE' });
}

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

export async function acceptMeetingInvitation(
  meetingId: string
): Promise<Meeting> {
  const res = await apiFetch(`/api/meetings/${meetingId}/accept`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return res.json();
}

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
