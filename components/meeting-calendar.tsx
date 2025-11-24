'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, isSameDay, isToday } from 'date-fns';
import { ko } from 'date-fns/locale';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { buildMonthGrid } from '@/lib/calendar-utils';
import type {
  Meeting,
  TimeSlotAvailability,
  DailyCountDto,
  ParticipantTimeStatus,
} from '@/types/meeting';
import {
  fetchDailyAvailability,
  patchParticipantAvailability,
  type AvailabilitySlotUpdatePayload,
} from '@/lib/api';

// 헬퍼 함수: time 문자열 ("HH:00")을 슬롯 번호(0~23)로 변환
const getSlotNumberFromTime = (time: string): number => {
  const [hour] = time.split(':').map(Number);
  return hour;
};

interface MeetingCalendarProps {
  meeting: Meeting;
  currentUserEmail?: string;
  currentUserId?: string;
}

export function MeetingCalendar({
  meeting,
  currentUserId,
}: MeetingCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [view, setView] = React.useState<'month' | 'day'>('month');
  const [dailyStats, setDailyStats] = React.useState<
    Record<string, DailyCountDto>
  >({});

  const initialParticipant = meeting.participants?.find(
    (p) => p.userId === currentUserId
  );
  // NOTE: timeStatuses는 이제 List<ParticipantTimeStatus>이며, 각 객체는 date와 impossibleSlots를 가짐.
  const [participantTimeStatuses, setParticipantTimeStatuses] = React.useState<
    ParticipantTimeStatus[]
  >(initialParticipant?.timeStatuses || []);

  const [selectedSlots, setSelectedSlots] = React.useState<Set<string>>(
    new Set()
  );
  const [isSelecting, setIsSelecting] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStartIdx, setDragStartIdx] = React.useState<number | null>(null);
  const [dragEndIdx, setDragEndIdx] = React.useState<number | null>(null);
  const [dragTargetStatus, setDragTargetStatus] = React.useState<
    'POSSIBLE' | 'IMPOSSIBLE' | null
  >(null);

  const scrollRef = React.useRef<HTMLDivElement>(null);

  const stateRef = React.useRef({
    isDragging,
    dragStartIdx,
    dragEndIdx,
    dragTargetStatus,
    selectedDate,
    participantTimeStatuses,
  });

  React.useEffect(() => {
    stateRef.current = {
      isDragging,
      dragStartIdx,
      dragEndIdx,
      dragTargetStatus,
      selectedDate,
      participantTimeStatuses,
    };
  }, [
    isDragging,
    dragStartIdx,
    dragEndIdx,
    dragTargetStatus,
    selectedDate,
    participantTimeStatuses,
  ]);

  const getTimeSlots = (date: Date): TimeSlotAvailability[] => {
    const slots: TimeSlotAvailability[] = [];
    const totalParticipants =
      meeting.participants?.length || meeting.invitedUserIds?.length || 0;

    const currentParticipant = meeting.participants?.find(
      (p) => p.userId === currentUserId
    );
    const participantStatuses = participantTimeStatuses;

    // ✨ 해당 날짜의 상태 객체를 찾습니다. (DB는 'YYYY-MM-DD' 문자열로 저장)
    const dateStr = format(date, 'yyyy-MM-dd');
    const todayStatus = participantStatuses.find(
      (ts) =>
        ts.date === dateStr ||
        format(new Date(ts.date), 'yyyy-MM-dd') === dateStr
    );

    for (let hour = 0; hour < 24; hour++) {
      const time = `${hour.toString().padStart(2, '0')}:00`;
      // NOTE: 기존의 slotStart/slotEnd Date 객체는 이제 myStatus 결정에 사용되지 않습니다.
      const slotStart = new Date(date);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(date);
      slotEnd.setHours(hour + 1, 0, 0, 0);

      let availableCount = 0;
      let myStatus: 'POSSIBLE' | 'IMPOSSIBLE' | 'UNSET' = 'UNSET';

      // 1. 후보 시간 확인 (isCandidate)
      const isCandidate =
        meeting.requirement.isAllDay ||
        meeting.requirement.timeConstraints.length === 0 ||
        meeting.requirement.timeConstraints.some((tc) => {
          const [startHour] = tc.startTime.split(':').map(Number);
          const [endHour] = tc.endTime.split(':').map(Number);
          return hour >= startHour && hour < endHour;
        });

      // 2. 참여자별 상태 확인 (availableCount)
      if (meeting.participants) {
        availableCount = meeting.participants.reduce((count, participant) => {
          const ts = participant.timeStatuses?.find((t) => t.date === dateStr);
          // 해당 슬롯(hour)이 impossibleSlots에 포함되어 있지 않으면 가능
          if (ts && ts.impossibleSlots?.includes(hour)) {
            return count;
          }
          return count + 1;
        }, 0);
      }

      // 3. ✨ 현재 사용자(My Status) 상태 결정 (슬롯 번호 기반)
      if (currentParticipant && isCandidate) {
        if (todayStatus && todayStatus.impossibleSlots?.includes(hour)) {
          // 해당 날짜의 IMPOSSIBLE 슬롯 Set에 현재 hour가 포함되어 있으면 불가능
          myStatus = 'IMPOSSIBLE';
        } else {
          // IMPOSSIBLE 슬롯 Set에 포함되어 있지 않으면 가능 (DB에 없는 것은 POSSIBLE로 간주)
          myStatus = 'POSSIBLE';
        }
      }

      slots.push({
        time,
        availableCount,
        totalParticipants,
        isCandidate,
        myStatus,
      });
    }
    return slots;
  };

  const slots = getTimeSlots(selectedDate || new Date());
  const slotsRef = React.useRef(slots);
  slotsRef.current = slots;

  // 단일 클릭 시 슬롯 번호 요청
  const handleSlotToggle = async (
    time: string,
    currentStatus: 'POSSIBLE' | 'IMPOSSIBLE' | 'UNSET'
  ) => {
    if (!selectedDate || !currentUserId) return;

    const newStatus: 'POSSIBLE' | 'IMPOSSIBLE' =
      currentStatus === 'POSSIBLE' || currentStatus === 'UNSET'
        ? 'IMPOSSIBLE'
        : 'POSSIBLE';

    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    // 슬롯 번호 기반 페이로드 생성
    const payload: AvailabilitySlotUpdatePayload[] = [
      {
        date: dateStr,
        slots: [getSlotNumberFromTime(time)],
        status: newStatus,
      },
    ];

    try {
      const response = await patchParticipantAvailability(meeting.id, payload);

      const updatedParticipant = response.participants?.find(
        (p) => p.userId === currentUserId
      );
      if (updatedParticipant) {
        setParticipantTimeStatuses(updatedParticipant.timeStatuses || []);
      }
    } catch (error) {
      console.error('Failed to update availability via PATCH', error);
    }
  };

  // 드래그 시작 상태 결정
  const handleMouseDown = (
    index: number,
    status: 'POSSIBLE' | 'IMPOSSIBLE' | 'UNSET'
  ) => {
    setIsDragging(true);
    setDragStartIdx(index);
    setDragEndIdx(index);

    const targetStatus: 'POSSIBLE' | 'IMPOSSIBLE' =
      status === 'POSSIBLE' || status === 'UNSET' ? 'IMPOSSIBLE' : 'POSSIBLE';

    setDragTargetStatus(targetStatus);
  };

  const handleMouseEnter = (index: number) => {
    if (isDragging) {
      setDragEndIdx(index);
    }
  };

  // 드래그 종료 시 슬롯 번호 요청
  const handleMouseUp = async () => {
    const {
      isDragging,
      dragStartIdx,
      dragEndIdx,
      dragTargetStatus,
      selectedDate,
    } = stateRef.current;
    const currentSlots = slotsRef.current;

    if (
      !isDragging ||
      dragStartIdx === null ||
      dragEndIdx === null ||
      !dragTargetStatus ||
      !selectedDate ||
      !currentUserId
    ) {
      setIsDragging(false);
      setDragStartIdx(null);
      setDragEndIdx(null);
      setDragTargetStatus(null);
      return;
    }

    const start = Math.min(dragStartIdx, dragEndIdx);
    const end = Math.max(dragStartIdx, dragEndIdx);

    const selectedSlots: number[] = [];

    for (let i = start; i <= end; i++) {
      const slot = currentSlots[i];
      if (slot.isCandidate) {
        selectedSlots.push(getSlotNumberFromTime(slot.time));
      }
    }

    if (selectedSlots.length > 0) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      const payload: AvailabilitySlotUpdatePayload[] = [
        {
          date: dateStr,
          slots: selectedSlots,
          status: dragTargetStatus,
        },
      ];

      try {
        const response = await patchParticipantAvailability(
          meeting.id,
          payload
        );

        const updatedParticipant = response.participants?.find(
          (p) => p.userId === currentUserId
        );
        if (updatedParticipant) {
          setParticipantTimeStatuses(updatedParticipant.timeStatuses || []);
        }
      } catch (error) {
        console.error('Failed to batch update availability via PATCH', error);
      }
    }

    setIsDragging(false);
    setDragStartIdx(null);
    setDragEndIdx(null);
    setDragTargetStatus(null);
  };

  React.useEffect(() => {
    const initialDate = new Date(meeting.requirement.dateRangeStart);
    setCurrentMonth(
      new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
    );

    const loadDailyStats = async () => {
      try {
        const stats = await fetchDailyAvailability(meeting.id);
        console.log('[v0] Daily stats loaded:', stats);
        setDailyStats(stats);
      } catch (error) {
        console.error('Failed to load daily availability', error);
      }
    };
    loadDailyStats();

    const initialParticipant = meeting.participants?.find(
      (p) => p.userId === currentUserId
    );
    if (initialParticipant) {
      setParticipantTimeStatuses(initialParticipant.timeStatuses || []);
    }
  }, [meeting.id, currentUserId, meeting.participants]);

  React.useEffect(() => {
    if (view === 'day' && scrollRef.current) {
      setTimeout(() => {
        const scrollContainer = scrollRef.current?.querySelector(
          '[data-radix-scroll-area-viewport]'
        );
        if (scrollContainer) {
          scrollContainer.scrollTop = 540;
        }
      }, 100);
    }
  }, [view]);

  React.useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) handleMouseUp();
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging]);

  const getDailyStats = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const stat = dailyStats[dateKey];

    if (!stat) {
      return {
        availableCount: 0,
        totalParticipants:
          meeting.participants?.length || meeting.invitedUserIds?.length || 0,
        isFullyAvailable: false,
      };
    }

    return {
      availableCount: stat.availableParticipants,
      totalParticipants: stat.totalParticipants,
      isFullyAvailable:
        stat.availableParticipants === stat.totalParticipants &&
        stat.totalParticipants > 0,
    };
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setView('day');
  };

  const handleBackToMonth = () => {
    setView('month');
    setSelectedDate(null);
  };

  const isDateInRange = (date: Date) => {
    const start = new Date(meeting.requirement.dateRangeStart);
    const end = new Date(meeting.requirement.dateRangeEnd);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return date >= start && date <= end;
  };

  const renderMonthView = () => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const grid = buildMonthGrid(y, m);

    return (
      <Card className="flex h-full flex-col overflow-hidden shadow-lg select-none">
        <div className="flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevMonth}
            className="hover:bg-primary/10"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-bold text-foreground flex-1 text-center">
            {format(currentMonth, 'yyyy년 M월', { locale: ko })}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            className="hover:bg-primary/10"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto scrollbar-hide pb-4">
          <div className="mb-3 grid grid-cols-7 gap-1 text-center">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
              <div
                key={day}
                className={cn(
                  'text-sm font-bold',
                  idx === 0
                    ? 'text-red-500'
                    : idx === 6
                    ? 'text-blue-500'
                    : 'text-muted-foreground'
                )}
              >
                {day}
              </div>
            ))}
          </div>

          <div className="space-y-1">
            {grid.map((week, weekIdx) => (
              <div key={`week-${weekIdx}`} className="grid grid-cols-7 gap-1">
                {week.map((date, colIdx) => {
                  if (!date)
                    return (
                      <div key={`empty-${colIdx}`} className="min-h-[100px]" />
                    );

                  const isInRange = isDateInRange(date);

                  if (!isInRange) {
                    return (
                      <div
                        key={date.toString()}
                        className="min-h-[100px] w-full rounded-lg border border-transparent p-2 opacity-30 bg-muted/20"
                      >
                        <span className="text-sm font-semibold text-muted-foreground">
                          {date.getDate()}
                        </span>
                      </div>
                    );
                  }

                  const stats = getDailyStats(date);
                  const isSelected =
                    selectedDate && isSameDay(date, selectedDate);
                  const isTodayDate = isToday(date);

                  let bgClass = 'bg-card/50 hover:bg-accent/50';
                  let borderClass = 'border-transparent';

                  if (stats.isFullyAvailable) {
                    bgClass = 'bg-green-100 dark:bg-green-900/30';
                    borderClass = 'border-green-500';
                  } else if (stats.availableCount > 0) {
                    const intensity =
                      stats.availableCount / (stats.totalParticipants || 1);
                    if (intensity > 0.6) {
                      bgClass = 'bg-green-50 dark:bg-green-900/10';
                      borderClass = 'border-green-200 dark:border-green-800';
                    } else {
                      bgClass = 'bg-yellow-50 dark:bg-yellow-900/10';
                      borderClass = 'border-yellow-200 dark:border-yellow-800';
                    }
                  }

                  return (
                    <button
                      key={date.toString()}
                      onClick={() => handleDateClick(date)}
                      className={cn(
                        'relative min-h-[100px] w-full rounded-lg border p-2 text-left transition-all duration-200 flex flex-col justify-between group',
                        bgClass,
                        borderClass,
                        isSelected && 'ring-2 ring-primary ring-offset-1',
                        isTodayDate && 'bg-primary/5'
                      )}
                    >
                      <span
                        className={cn(
                          'text-sm font-semibold',
                          isTodayDate ? 'text-primary' : 'text-foreground'
                        )}
                      >
                        {date.getDate()}
                      </span>

                      {stats.availableCount > 0 && (
                        <div className="mt-1 w-full">
                          <div className="flex items-center gap-1 mb-1">
                            <div
                              className={cn(
                                'h-1.5 w-1.5 rounded-full',
                                stats.isFullyAvailable
                                  ? 'bg-green-500'
                                  : 'bg-yellow-500'
                              )}
                            />
                            <span className="text-[10px] font-medium text-muted-foreground">
                              {stats.availableCount}/{stats.totalParticipants}
                            </span>
                          </div>
                          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                stats.isFullyAvailable
                                  ? 'bg-green-500'
                                  : 'bg-yellow-500'
                              )}
                              style={{
                                width: `${
                                  (stats.availableCount /
                                    (stats.totalParticipants || 1)) *
                                  100
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mt-6">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
              <span>모두 가능</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
              <span>일부 가능</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-muted border" />
              <span>불가능/미정</span>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const renderDayView = () => {
    if (!selectedDate) return null;
    const slots = getTimeSlots(selectedDate);

    const handleSlotToggle = async (
      time: string,
      currentStatus: 'POSSIBLE' | 'IMPOSSIBLE' | 'UNSET'
    ) => {
      if (!selectedDate || !currentUserId) return;

      const newStatus: 'POSSIBLE' | 'IMPOSSIBLE' =
        currentStatus === 'POSSIBLE' || currentStatus === 'UNSET'
          ? 'IMPOSSIBLE'
          : 'POSSIBLE';

      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      const payload: AvailabilitySlotUpdatePayload[] = [
        {
          date: dateStr,
          slots: [getSlotNumberFromTime(time)],
          status: newStatus,
        },
      ];

      try {
        const response = await patchParticipantAvailability(
          meeting.id,
          payload
        );

        const updatedParticipant = response.participants?.find(
          (p) => p.userId === currentUserId
        );
        if (updatedParticipant) {
          setParticipantTimeStatuses(updatedParticipant.timeStatuses || []);
        }
      } catch (error) {
        console.error('Failed to update availability via PATCH', error);
      }
    };

    const handleMouseDown = (
      index: number,
      status: 'POSSIBLE' | 'IMPOSSIBLE' | 'UNSET'
    ) => {
      setIsDragging(true);
      setDragStartIdx(index);
      setDragEndIdx(index);

      const targetStatus: 'POSSIBLE' | 'IMPOSSIBLE' =
        status === 'POSSIBLE' || status === 'UNSET' ? 'IMPOSSIBLE' : 'POSSIBLE';

      setDragTargetStatus(targetStatus);
    };

    const handleMouseEnter = (index: number) => {
      if (isDragging) {
        setDragEndIdx(index);
      }
    };

    const handleMouseUp = async () => {
      const {
        isDragging,
        dragStartIdx,
        dragEndIdx,
        dragTargetStatus,
        selectedDate,
      } = stateRef.current;
      const currentSlots = slotsRef.current;

      if (
        !isDragging ||
        dragStartIdx === null ||
        dragEndIdx === null ||
        !dragTargetStatus ||
        !selectedDate ||
        !currentUserId
      ) {
        setIsDragging(false);
        setDragStartIdx(null);
        setDragEndIdx(null);
        setDragTargetStatus(null);
        return;
      }

      const start = Math.min(dragStartIdx, dragEndIdx);
      const end = Math.max(dragStartIdx, dragEndIdx);

      const selectedSlots: number[] = [];

      for (let i = start; i <= end; i++) {
        const slot = currentSlots[i];
        if (slot.isCandidate) {
          selectedSlots.push(getSlotNumberFromTime(slot.time));
        }
      }

      if (selectedSlots.length > 0) {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');

        const payload: AvailabilitySlotUpdatePayload[] = [
          {
            date: dateStr,
            slots: selectedSlots,
            status: dragTargetStatus,
          },
        ];

        try {
          const response = await patchParticipantAvailability(
            meeting.id,
            payload
          );

          const updatedParticipant = response.participants?.find(
            (p) => p.userId === currentUserId
          );
          if (updatedParticipant) {
            setParticipantTimeStatuses(updatedParticipant.timeStatuses || []);
          }
        } catch (error) {
          console.error('Failed to batch update availability via PATCH', error);
        }
      }

      setIsDragging(false);
      setDragStartIdx(null);
      setDragEndIdx(null);
      setDragTargetStatus(null);
    };

    return (
      <Card className="flex h-full flex-col overflow-hidden shadow-lg border-0 sm:border">
        <div className="flex items-center justify-between border-b p-4 bg-card shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToMonth}
              className="gap-1 pl-0 hover:bg-transparent hover:text-primary"
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="text-lg font-bold">
                {format(selectedDate, 'M월 d일 (E)', { locale: ko })}
              </span>
            </Button>
          </div>
          <div className="flex items-center gap-3 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
              <span>가능</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
              <span>불가능</span>
            </div>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto scrollbar-hide bg-background"
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            if (isDragging) handleMouseUp();
          }}
        >
          <div className="relative min-h-full pb-10">
            <div className="absolute left-0 top-0 bottom-0 w-16 border-r border-border/50 bg-muted/5 z-10">
              {Array.from({ length: 24 }, (_, hour) => (
                <div
                  key={`label-${hour}`}
                  className="h-14 flex items-start justify-center pt-2"
                >
                  <span className="text-xs font-medium text-muted-foreground">
                    {hour.toString().padStart(2, '0')}:00
                  </span>
                </div>
              ))}
              {/* 24시 라벨 추가 */}
              <div className="h-14 flex items-start justify-center pt-2">
                <span className="text-xs font-medium text-muted-foreground">
                  24:00
                </span>
              </div>
            </div>

            <div className="ml-16">
              {slots.map((slot, index) => {
                const availabilityRatio =
                  slot.totalParticipants > 0
                    ? slot.availableCount / slot.totalParticipants
                    : 0;
                let isAvailable = slot.myStatus === 'POSSIBLE';
                let isUnavailable = slot.myStatus === 'IMPOSSIBLE';

                if (
                  isDragging &&
                  dragStartIdx !== null &&
                  dragEndIdx !== null &&
                  dragTargetStatus
                ) {
                  const start = Math.min(dragStartIdx, dragEndIdx);
                  const end = Math.max(dragStartIdx, dragEndIdx);
                  if (index >= start && index <= end && slot.isCandidate) {
                    isAvailable = dragTargetStatus === 'POSSIBLE';
                    isUnavailable = dragTargetStatus === 'IMPOSSIBLE';
                  }
                }

                return (
                  <div
                    key={index}
                    onMouseDown={(e) => {
                      if (slot.isCandidate) {
                        e.preventDefault();
                        handleMouseDown(index, slot.myStatus);
                      }
                    }}
                    onMouseEnter={() => handleMouseEnter(index)}
                    onClick={() =>
                      !isDragging &&
                      slot.isCandidate &&
                      handleSlotToggle(slot.time, slot.myStatus)
                    }
                    className={cn(
                      'h-14 border-b border-border/50 relative flex items-center px-4 transition-colors select-none',
                      slot.isCandidate
                        ? 'cursor-pointer hover:bg-accent/30'
                        : 'bg-muted/10 cursor-not-allowed opacity-50',
                      isAvailable && 'bg-green-500/10',
                      isUnavailable && 'bg-red-500/10',
                      isDragging &&
                        dragStartIdx !== null &&
                        dragEndIdx !== null &&
                        index >= Math.min(dragStartIdx, dragEndIdx) &&
                        index <= Math.max(dragStartIdx, dragEndIdx) &&
                        slot.isCandidate
                        ? 'ring-2 ring-primary ring-inset'
                        : ''
                    )}
                  >
                    {slot.isCandidate && slot.availableCount > 0 && (
                      <div
                        className="absolute left-0 top-0 bottom-0 bg-blue-500/5 transition-all duration-500"
                        style={{ width: `${availabilityRatio * 100}%` }}
                      />
                    )}

                    <div className="relative z-10 flex items-center justify-between w-full">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">
                          {slot.availableCount}/{slot.totalParticipants}명 가능
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isAvailable && (
                          <div className="flex items-center gap-1 text-green-600 bg-green-100/50 px-2 py-1 rounded-full">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-xs font-bold">참여 가능</span>
                          </div>
                        )}
                        {isUnavailable && (
                          <div className="flex items-center gap-1 text-red-600 bg-red-100/50 px-2 py-1 rounded-full">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-xs font-bold">참여 불가</span>
                          </div>
                        )}
                        {slot.isCandidate &&
                          slot.myStatus === 'UNSET' &&
                          !isDragging && (
                            <span className="text-xs text-muted-foreground/50">
                              선택하여 설정
                            </span>
                          )}
                      </div>
                    </div>

                    {isAvailable && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500" />
                    )}
                    {isUnavailable && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
                    )}
                  </div>
                );
              })}
            </div>

            {isToday(selectedDate) && (
              <div
                className="absolute left-0 right-0 border-t-2 border-red-500 z-20 pointer-events-none flex items-center"
                style={{
                  top: `${
                    new Date().getHours() * 56 +
                    (new Date().getMinutes() / 60) * 56
                  }px`,
                }}
              >
                <div className="w-2 h-2 bg-red-500 rounded-full -ml-1" />
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="w-full h-full">
      {view === 'month' ? renderMonthView() : renderDayView()}
    </div>
  );
}
