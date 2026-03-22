'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { format, isToday, addMonths, subMonths, subDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  fetchDailyAvailability,
  patchParticipantAvailability,
  type AvailabilitySlotUpdatePayload,
} from '@/lib/api';
import type {
  Meeting,
  TimeSlotAvailability,
  DailyCountDto,
  ParticipantTimeStatus,
} from '@/types/meeting';
import { toast } from '@/hooks/use-toast';
import { buildMonthGrid } from '@/lib/helpers';

// 헬퍼 함수: time 문자열 ("HH:00")을 슬롯 번호(0~23)로 변환 (현재는 미사용이지만 남겨둠)
const getSlotNumberFromTime = (time: string): number => {
  const [hour] = time.split(':').map(Number);
  return hour;
};

interface MeetingCalendarProps {
  meeting: Meeting;
  currentUserEmail?: string;
  currentUserId?: string;
  readonly?: boolean;
}

// KST(+9) 기준으로 UTC 날짜가 바뀌는 경계 (0~8 / 9~23 구분)
const TIMEZONE_OFFSET_HOURS = 9;

/**
 * 선택된 슬롯(slots)을 기준으로,
 * - 슬롯 전체가 0~8이거나, 9~23에만 있으면 → 1개의 payload
 * - 0~8, 9~23을 모두 포함하면 → 전날/당일 기준으로 2개의 payload
 *   (슬롯 인덱스는 그대로, 날짜만 분리)
 */
// 항상 선택한 날짜에 대해 하나의 payload만 생성
const buildPatchPayloadForSlots = (
  selectedDate: Date,
  slots: number[],
  status: 'POSSIBLE' | 'IMPOSSIBLE'
): AvailabilitySlotUpdatePayload[] => {
  if (slots.length === 0) return [];

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  return [
    {
      date: dateStr,
      slots: Array.from(new Set(slots)).sort((a, b) => a - b),
      status,
    },
  ];
};

export function MeetingCalendar({
  meeting,
  currentUserId,
  readonly = false,
}: MeetingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<'month' | 'day'>('month');
  const [dailyStats, setDailyStats] = useState<Record<string, DailyCountDto>>(
    {}
  );

  const initialParticipant = meeting.participants?.find(
    (p) => p.userId === currentUserId
  );
  const [participantTimeStatuses, setParticipantTimeStatuses] = useState<
    ParticipantTimeStatus[]
  >(initialParticipant?.timeStatuses || []);

  const [slots, setSlots] = useState<TimeSlotAvailability[]>([]);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStartIdx, setDragStartIdx] = useState<number | null>(null);
  const [dragEndIdx, setDragEndIdx] = useState<number | null>(null);
  const [dragTargetStatus, setDragTargetStatus] = useState<
    'POSSIBLE' | 'IMPOSSIBLE' | null
  >(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const currentParticipant = meeting.participants?.find(
    (p) => p.userId === currentUserId
  );
  const todayStatus = currentParticipant?.timeStatuses?.find(
    (ts) => selectedDate && ts.date === format(selectedDate, 'yyyy-MM-dd')
  );

  const totalParticipants = meeting.participants?.length || 0;

  const generateDailySchedule = useCallback(
    (date: Date): TimeSlotAvailability[] => {
      const slots: TimeSlotAvailability[] = [];
      const dateStr = format(date, 'yyyy-MM-dd');

      for (let hour = 0; hour < 24; hour++) {
        const time = `${hour.toString().padStart(2, '0')}:00`;

        let availableCount = 0;
        let myStatus: 'POSSIBLE' | 'IMPOSSIBLE' | 'UNSET' = 'UNSET';

        const availableParticipants: string[] = [];
        const unavailableParticipants: string[] = [];
        const unsetParticipants: string[] = [];

        const isCandidate =
          meeting.requirement.isAllDay ||
          meeting.requirement.timeConstraints.length === 0 ||
          meeting.requirement.timeConstraints.some((tc) => {
            const [startHour] = tc.startTime.split(':').map(Number);
            const [endHour] = tc.endTime.split(':').map(Number);
            return hour >= startHour && hour < endHour;
          });

        if (meeting.participants) {
          meeting.participants.forEach((participant) => {
            if (participant.status === 'PENDING') {
              unsetParticipants.push(participant.name);
              return;
            }

            const ts = participant.timeStatuses?.find(
              (t) => t.date === dateStr
            );
            if (ts && ts.impossibleSlots?.includes(hour)) {
              unavailableParticipants.push(participant.name);
            } else {
              availableCount++;
              availableParticipants.push(participant.name);
            }
          });
        }

        if (currentParticipant && isCandidate) {
          if (currentParticipant.status === 'PENDING') {
            myStatus = 'UNSET';
          } else if (
            todayStatus &&
            todayStatus.impossibleSlots?.includes(hour)
          ) {
            myStatus = 'IMPOSSIBLE';
          } else {
            myStatus = 'POSSIBLE';
          }
        }

        slots.push({
          time,
          availableCount,
          totalParticipants,
          isCandidate,
          myStatus,
          availableParticipants,
          unavailableParticipants,
        } as any);
      }

      return slots;
    },
    [meeting, currentParticipant, todayStatus, totalParticipants]
  );

  const loadDailyAvailability = useCallback(async () => {
    try {
      const stats = await fetchDailyAvailability(meeting.id);
      setDailyStats(stats);
    } catch (error) {
      console.error('Failed to load daily availability', error);
      toast({ title: '가용 시간 정보를 불러오지 못했습니다.', variant: 'destructive' });
    }
  }, [meeting.id]);

  useEffect(() => {
    const initialDate = new Date(meeting.requirement.dateRangeStart);
    setCurrentMonth(
      new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
    );
    loadDailyAvailability();

    const initialParticipant = meeting.participants?.find(
      (p) => p.userId === currentUserId
    );
    if (initialParticipant) {
      setParticipantTimeStatuses(initialParticipant.timeStatuses || []);
    }
  }, [meeting.id, currentUserId, meeting.participants, loadDailyAvailability]);

  useEffect(() => {
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

  const getDailyStats = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const totalCount =
      meeting.participants?.length || meeting.invitedUserIds?.length || 0;

    if (!meeting.participants || meeting.participants.length === 0) {
      return {
        availableCount: 0,
        totalParticipants: totalCount,
        isFullyAvailable: false,
      };
    }

    // 후보 시간대 계산
    const candidateHours: number[] = [];
    if (
      meeting.requirement.isAllDay ||
      meeting.requirement.timeConstraints.length === 0
    ) {
      for (let h = 0; h < 24; h++) candidateHours.push(h);
    } else {
      meeting.requirement.timeConstraints.forEach((tc) => {
        const [startHour] = tc.startTime.split(':').map(Number);
        const [endHour] = tc.endTime.split(':').map(Number);
        for (let h = startHour; h < endHour; h++) {
          if (!candidateHours.includes(h)) candidateHours.push(h);
        }
      });
    }

    let availableCount = 0;
    meeting.participants.forEach((participant) => {
      if (participant.status === 'PENDING') {
        return;
      }

      const ts = participant.timeStatuses?.find((t) => t.date === dateKey);
      const impossibleSlots = ts?.impossibleSlots || [];

      const hasAvailableSlot = candidateHours.some(
        (hour) => !impossibleSlots.includes(hour)
      );

      if (hasAvailableSlot) {
        availableCount++;
      }
    });

    const pendingCount = meeting.participants.filter(
      (p) => p.status === 'PENDING'
    ).length;

    return {
      availableCount,
      totalParticipants: totalCount,
      isFullyAvailable:
        availableCount === totalCount && totalCount > 0 && pendingCount === 0,
    };
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setView('day');
    setSlots(generateDailySchedule(date));
  };

  const handleBackToMonth = () => {
    setView('month');
    setSelectedDate(null);
    loadDailyAvailability();
  };

  const isDateInRange = (date: Date) => {
    const start = new Date(meeting.requirement.dateRangeStart);
    const end = new Date(meeting.requirement.dateRangeEnd);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return date >= start && date <= end;
  };

  // 클릭/드래그 공통 시작점: 클릭도 "길이 1짜리 드래그"로 취급
  const handleMouseDown = (
    index: number,
    status: 'POSSIBLE' | 'IMPOSSIBLE' | 'UNSET'
  ) => {
    if (readonly) return;

    setIsDragging(true);
    setDragStartIdx(index);
    setDragEndIdx(index);

    const targetStatus: 'POSSIBLE' | 'IMPOSSIBLE' =
      status === 'POSSIBLE' || status === 'UNSET' ? 'IMPOSSIBLE' : 'POSSIBLE';

    setDragTargetStatus(targetStatus);
  };

  const handleMouseEnter = (index: number) => {
    if (isDragging && !readonly) {
      setDragEndIdx(index);
    }
  };

  const handleMouseUp = async () => {
    if (readonly) {
      setIsDragging(false);
      return;
    }

    if (
      !isDragging ||
      dragStartIdx === null ||
      dragEndIdx === null ||
      !dragTargetStatus ||
      !selectedDate ||
      !currentParticipant
    ) {
      setIsDragging(false);
      return;
    }

    const start = Math.min(dragStartIdx, dragEndIdx);
    const end = Math.max(dragStartIdx, dragEndIdx);

    const currentSlots = generateDailySchedule(selectedDate);
    const selectedSlots: number[] = [];

    for (let i = start; i <= end; i++) {
      if (currentSlots[i]?.isCandidate) {
        const [hour] = currentSlots[i].time.split(':').map(Number);
        selectedSlots.push(hour);
      }
    }

    if (selectedSlots.length === 0) {
      setIsDragging(false);
      setDragStartIdx(null);
      setDragEndIdx(null);
      setDragTargetStatus(null);
      return;
    }

    // UTC 경계 기준으로 payload 분리
    const payloads = buildPatchPayloadForSlots(
      selectedDate,
      selectedSlots,
      dragTargetStatus
    );

    try {
      // 분리된 payload 각각 PATCH
      for (const payload of payloads) {
        await patchParticipantAvailability(meeting.id, [payload]);
      }

      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const updatedParticipant = { ...currentParticipant };
      const statusIndex = updatedParticipant.timeStatuses?.findIndex(
        (ts) => ts.date === dateStr
      );

      if (statusIndex !== undefined && statusIndex >= 0) {
        let existingSlots =
          updatedParticipant.timeStatuses![statusIndex].impossibleSlots || [];
        if (dragTargetStatus === 'IMPOSSIBLE') {
          existingSlots = Array.from(
            new Set([...existingSlots, ...selectedSlots])
          );
        } else {
          existingSlots = existingSlots.filter(
            (s) => !selectedSlots.includes(s)
          );
        }
        updatedParticipant.timeStatuses![statusIndex].impossibleSlots =
          existingSlots;
      } else {
        if (!updatedParticipant.timeStatuses)
          updatedParticipant.timeStatuses = [];
        updatedParticipant.timeStatuses.push({
          date: dateStr,
          impossibleSlots:
            dragTargetStatus === 'IMPOSSIBLE' ? selectedSlots : [],
          status: 'IMPOSSIBLE',
        });
      }

      setSlots((prevSlots) =>
        prevSlots.map((s, idx) => {
          if (idx >= start && idx <= end && s.isCandidate) {
            return { ...s, myStatus: dragTargetStatus };
          }
          return s;
        })
      );

      await loadDailyAvailability();
    } catch (error) {
      console.error('Failed to batch update availability', error);
      toast({ title: '시간 업데이트에 실패했습니다.', variant: 'destructive' });
      toast({
        title: '업데이트 실패',
        description: '일정을 업데이트하지 못했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsDragging(false);
      setDragStartIdx(null);
      setDragEndIdx(null);
      setDragTargetStatus(null);
    }
  };

  const renderMonthView = () => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const grid = buildMonthGrid(y, m);

    return (
      <Card className="flex flex-col overflow-hidden shadow-lg select-none h-full">
        {readonly && (
          <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-700 dark:text-amber-300">
              읽기 전용 모드
            </span>
          </div>
        )}
        <div className="flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5 p-3 shrink-0">
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

        <div className="flex-1 p-2 sm:p-3 flex flex-col">
          <div className="mb-2 grid grid-cols-7 gap-1 text-center">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
              <div
                key={day}
                className={cn(
                  'text-xs sm:text-sm font-bold',
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

          <div className="flex-1 flex flex-col gap-1">
            {grid.map((week, weekIdx) => (
              <div
                key={`week-${weekIdx}`}
                className="grid grid-cols-7 gap-1 flex-1"
              >
                {week.map((date, colIdx) => {
                  if (!date)
                    return <div key={`empty-${colIdx}`} className="min-h-0" />;

                  const isInRange = isDateInRange(date);
                  const dayNum = date.getDay();
                  const stats = getDailyStats(date);

                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => isInRange && handleDateClick(date)}
                      disabled={!isInRange}
                      className={cn(
                        'flex flex-col items-center justify-center rounded-lg text-xs sm:text-sm font-medium transition-all min-h-[52px] sm:min-h-[64px]',
                        isToday(date) && 'ring-2 ring-primary',
                        isInRange
                          ? 'hover:bg-primary/20 cursor-pointer'
                          : 'opacity-40 cursor-not-allowed',
                        stats.isFullyAvailable && isInRange
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : stats.availableCount > 0 && isInRange
                          ? 'bg-yellow-100 dark:bg-yellow-900/30'
                          : isInRange
                          ? 'bg-gray-300/80 dark:bg-gray-600/80'
                          : ''
                      )}
                    >
                      <span
                        className={cn(
                          'font-semibold',
                          dayNum === 0
                            ? 'text-red-500'
                            : dayNum === 6
                            ? 'text-blue-500'
                            : ''
                        )}
                      >
                        {date.getDate()}
                      </span>
                      {isInRange && (
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {stats.availableCount}/{stats.totalParticipants}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-3 justify-center text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/30 border border-green-500" />
              <span className="text-muted-foreground">전원 가능</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-500" />
              <span className="text-muted-foreground">일부 가능</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-gray-300/80 dark:bg-gray-600/80 border border-gray-500" />
              <span className="text-muted-foreground">가능 인원 없음</span>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const renderDayView = () => {
    if (!selectedDate) return null;

    const currentSlots = generateDailySchedule(selectedDate);

    return (
      <Card className="flex flex-col overflow-hidden shadow-lg h-full">
        {readonly && (
          <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-700 dark:text-amber-300">
              읽기 전용 모드
            </span>
          </div>
        )}
        <div className="flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5 p-3 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBackToMonth}
            className="hover:bg-primary/10"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-bold text-foreground">
            {format(selectedDate, 'M월 d일 (E)', { locale: ko })}
          </h2>
          <div className="w-10" />
        </div>

        <div
          className="flex-1 overflow-y-auto relative"
          ref={scrollRef}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div className="relative">
            {/* 시간대 레이블들 - 1시부터 23시까지 (B 스타일 레이아웃) */}
            {Array.from({ length: 23 }).map((_, idx) => {
              const hour = idx + 1;
              return (
                <div
                  key={`time-label-${hour}`}
                  className="absolute left-0 w-16 flex items-center justify-end pr-2 pointer-events-none"
                  style={{ top: `${(idx + 1) * 56}px` }}
                >
                  <span className="text-xs font-medium text-muted-foreground">
                    {`${hour.toString().padStart(2, '0')}:00`}
                  </span>
                </div>
              );
            })}

            {/* 시간대 슬롯들 - 24개 모두 표시 (0~23시) */}
            <div className="pl-16 border-l">
              {currentSlots.map((slot, index) => {
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

                const slotWithParticipants = slot as TimeSlotAvailability & {
                  availableParticipants?: string[];
                  unavailableParticipants?: string[];
                };

                const availableRatio =
                  slot.totalParticipants > 0
                    ? slot.availableCount / slot.totalParticipants
                    : 0;
                const unavailableRatio = 1 - availableRatio;

                const unavailableCount =
                  slot.totalParticipants - slot.availableCount;

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
                    // 클릭은 드래그로만 처리하므로, onClick에서는 동작 안 함
                    onClick={(e) => {
                      e.preventDefault();
                    }}
                    className={cn(
                      'h-14 border-t border-border/30 relative flex items-center transition-colors select-none',
                      slot.isCandidate
                        ? readonly
                          ? 'cursor-not-allowed opacity-50'
                          : 'cursor-pointer hover:opacity-90'
                        : 'bg-muted/10 cursor-not-allowed opacity-50',
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
                    {/* 가능 영역 (B 스타일 바) */}
                    {slot.isCandidate && slot.availableCount > 0 && (
                      <div
                        className="absolute left-0 top-0 bottom-0 bg-teal-50 dark:bg-teal-900/40 transition-all duration-300 flex items-center justify-start px-2 sm:px-3 overflow-hidden"
                        style={{ width: `${availableRatio * 100}%` }}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-teal-700 dark:text-teal-300 whitespace-nowrap">
                            {slot.availableCount}명 가능
                          </span>
                          {slotWithParticipants.availableParticipants &&
                            slotWithParticipants.availableParticipants.length >
                              0 && (
                              <span className="text-[10px] text-teal-600 dark:text-teal-400 truncate max-w-full">
                                {slotWithParticipants.availableParticipants.join(
                                  ', '
                                )}
                              </span>
                            )}
                        </div>
                      </div>
                    )}

                    {/* 불가능 영역 (B 스타일 바) */}
                    {slot.isCandidate && unavailableCount > 0 && (
                      <div
                        className="absolute top-0 bottom-0 bg-pink-50 dark:bg-pink-900/30 transition-all duration-300 flex items-center justify-start px-2 sm:px-3 overflow-hidden"
                        style={{
                          right: 0,
                          width: `${unavailableRatio * 100}%`,
                          paddingRight: '80px',
                        }}
                      >
                        <div className="flex flex-col items-start min-w-0">
                          <span className="text-xs font-bold text-pink-700 dark:text-pink-300 whitespace-nowrap">
                            {unavailableCount}명 불가
                          </span>
                          {slotWithParticipants.unavailableParticipants &&
                            slotWithParticipants.unavailableParticipants
                              .length > 0 && (
                              <span className="text-[10px] text-pink-600 dark:text-pink-400 truncate max-w-full">
                                {slotWithParticipants.unavailableParticipants.join(
                                  ', '
                                )}
                              </span>
                            )}
                        </div>
                      </div>
                    )}

                    {/* 오른쪽 내 상태 뱃지 */}
                    <div className="absolute right-2 flex items-center gap-2 z-10 pointer-events-none">
                      {isAvailable && (
                        <div className="flex items-center gap-1 text-teal-700 dark:text-teal-300 bg-teal-100/95 dark:bg-teal-900/80 px-2 py-1 rounded-full shadow-sm">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-xs font-bold hidden sm:inline">
                            참여 가능
                          </span>
                        </div>
                      )}
                      {isUnavailable && (
                        <div className="flex items-center gap-1 text-rose-700 bg-rose-100/95 dark:bg-rose-900/80 px-2 py-1 rounded-full shadow-sm">
                          <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                          <span className="text-xs font-bold hidden sm:inline">
                            참여 불가
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 왼쪽 세로 표시선 */}
                    {isAvailable && (
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500 z-10" />
                    )}
                    {isUnavailable && (
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-500 z-10" />
                    )}
                  </div>
                );
              })}
            </div>
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
