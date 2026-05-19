export type TimeRangeDto = {
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
};

export type MeetingRequirementDto = {
  dateRangeStart: string; // "yyyy-MM-dd"
  dateRangeEnd: string; // "yyyy-MM-dd"
  isAllDay: boolean;
  timeConstraints: TimeRangeDto[];
};

// FriendDto: 공통 사용
export type FriendDto = {
  id: string;
  nickname: string;
  profileImageUrl?: string | null;
};

// 모임 생성 요청 DTO
export type MeetingCreateRequest = {
  name: string;
  invitedUserIds: string[];
  requirement: MeetingRequirementDto;
  defaultReflectTimetable: boolean;
  defaultReflectCalendar: boolean;
};

export type AvailableSlot = {
  start: string; // ISO 8601 Instant
  end: string; // ISO 8601 Instant
};

export type DailyCountDto = {
  date: string; // "yyyy-MM-dd"
  totalParticipants: number;
  availableParticipants: number;
};

export interface ParticipantTimeStatus {
  date: string; // "YYYY-MM-DD"
  impossibleSlots: number[]; // JSON 전송 시 배열
  status: 'IMPOSSIBLE';
}

export type DailyAvailabilityStats = {
  date: string; // "yyyy-MM-dd"
  availableCount: number;
  totalParticipants: number;
  isFullyAvailable: boolean;
};

export type TimeSlotAvailability = {
  time: string; // "HH:mm"
  availableCount: number;
  totalParticipants: number;
  isCandidate: boolean;
  myStatus: 'POSSIBLE' | 'IMPOSSIBLE' | 'UNSET';
  availableParticipants?: string[];
  unavailableParticipants?: string[];
};

// 모임 수정 DTO (호스트용)
export type MeetingUpdateRequest = {
  name: string;
  invitedUserIds: string[];
  requirement: {
    dateRangeStart: string;
    dateRangeEnd: string;
    isAllDay: boolean;
    timeConstraints: TimeRangeDto[];
  };
};

export type ParticipantSettingsUpdateRequest = {
  reflectTimetable: boolean;
  reflectCalendar: boolean;
};

export type MeetingParticipant = {
  userId: string;
  name: string;
  profileImageUrl?: string | null;
  status: 'ACCEPTED' | 'PENDING' | 'DECLINED';
  timeStatuses: ParticipantTimeStatus[];
  reflectTimetable: boolean;
  reflectCalendar: boolean;
};

export type MeetingStatus = 'PENDING' | 'CONFIRMED' | 'CLOSED';

export type Meeting = {
  id: string;
  name: string;
  hostUserId: string;
  invitedUserIds: string[];
  requirement: MeetingRequirementDto;
  confirmedStart?: string;
  confirmedEnd?: string;
  status: MeetingStatus;
  createdAt: string;
  participants?: MeetingParticipant[];
};

export type MeetingStatusUpdateRequest = {
  status: MeetingStatus;
  confirmedStart?: string; // 확정 시 최종 시작 시간 (ISO 8601)
  confirmedEnd?: string; // 확정 시 최종 종료 시간 (ISO 8601)
};
