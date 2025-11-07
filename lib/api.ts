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
