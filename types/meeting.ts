export type TimeRangeDto = {
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
};

export type MeetingRequirementDto = {
  dateRangeStart: string; // "yyyy-MM-dd"
  dateRangeEnd: string; // "yyyy-MM-dd"
  isAllDay: boolean;
  timeConstraints: TimeRangeDto[];
  // ✨ reflectTimetable, reflectCalendar는 제거
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
  defaultReflectTimetable: boolean; // 생성자 참여자용
  defaultReflectCalendar: boolean; // 생성자 참여자용
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
    // ✨ reflectTimetable, reflectCalendar도 삭제하고
    // 호스트/참여자별 설정은 updateParticipantSettings로 관리
  };
};

export type ParticipantSettingsUpdateRequest = {
  reflectTimetable: boolean;
  reflectCalendar: boolean;
};

export type MeetingParticipant = {
  userId: string;
  name: string;
  status: 'ACCEPTED' | 'PENDING' | 'DECLINED';
  timeStatuses: ParticipantTimeStatus[];
  reflectTimetable: boolean; // 개인 시간표 반영
  reflectCalendar: boolean; // 개인 캘린더 반영
};

export type Meeting = {
  id: string;
  name: string;
  hostUserId: string;
  invitedUserIds: string[];
  requirement: MeetingRequirementDto;
  confirmedStart?: string;
  confirmedEnd?: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'OPEN';
  createdAt: string;
  participants?: MeetingParticipant[];
};
