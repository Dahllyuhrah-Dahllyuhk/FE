// FE/lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

export async function fetchAllCalendarEvents(): Promise<any[]> {
  const url = `${API_BASE}/api/calendar/events`; // ❗️쿼리 없음
  const res = await fetch(url, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  if (res.status === 401 || res.status === 302 || res.redirected) {
    window.location.href = `${API_BASE}/oauth2/authorization/google`;
    return [];
  }
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    window.location.href = `${API_BASE}/oauth2/authorization/google`;
    return [];
  }

  const json = await res.json();
  return Array.isArray(json)
    ? json
    : Array.isArray(json?.events)
    ? json.events
    : [];
}

export async function createCalendarEvent(req: {
  title: string;
  description?: string;
  start: string;
  end: string;
  allDay?: boolean;
  timeZone?: string;
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
    window.location.href = `${API_BASE}/oauth2/authorization/google`;
    throw new Error('Authentication required');
  }

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to create event: ${res.status} - ${errorText}`);
  }

  const result = await res.json();
  return result;
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
    window.location.href = `${API_BASE}/oauth2/authorization/google`;
    throw new Error('Authentication required');
  }

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to update event: ${res.status} - ${errorText}`);
  }

  const result = await res.json();
  return result;
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const url = `${API_BASE}/api/calendar/events/${eventId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  if (res.status === 401 || res.status === 403) {
    window.location.href = `${API_BASE}/oauth2/authorization/google`;
    throw new Error('Authentication required');
  }

  // If already deleted (410 Gone), treat as success
  if (res.status === 410) {
    return;
  }

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to delete event: ${res.status} - ${errorText}`);
  }
}
