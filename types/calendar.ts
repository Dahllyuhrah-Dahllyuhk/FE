// FE/types/calendar.ts
export type RawCalendarEvent = {
  id: string;
  userEmail: string;
  title: string;
  description?: string | null;
  // 서버가 주는 원본 문자열 (예: "2025-11-07" 또는 "2016-11-29T17:00+09:00[Asia/Seoul]")
  start?: string;
  end?: string;
  // epoch ms (가능하면 이걸 우선 사용)
  startTimestamp?: number;
  endTimestamp?: number;
  allDay?: boolean;
  timeZone?: string;

  /** BE에서 내려주는 색상(Tailwind 클래스 등) */
  color?: string | null;
};

export type Event = {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  color: string;
  allDay?: boolean;
};
