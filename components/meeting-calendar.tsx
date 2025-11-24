'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  addDays,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<'month' | 'day'>('month');
  const [dailyStats, setDailyStats] = useState<Record<string, DailyCountDto>>(
    {}
  );

  const initialParticipant = meeting.participants?.find(
    (p) => p.userId === currentUserId
  );
  // NOTE: timeStatuses는 이제 List<ParticipantTimeStatus>이며, 각 객체는 date와 impossibleSlots를 가짐.
  const [participantTimeStatuses, setParticipantTimeStatuses] = useState<
    ParticipantTimeStatus[]
  >(initialParticipant?.timeStatuses || []);

  const [slots, setSlots] = useState<TimeSlotAvailability[]>([]);

  const [isSelecting, setIsSelecting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartIdx, setDragStartIdx] = useState<number | null>(null);
  const [dragEndIdx, setDragEndIdx] = useState<number | null>(null);
  const [dragTargetStatus, setDragTargetStatus] = useState<
    'POSSIBLE' | 'IMPOSSIBLE' | null
  >(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const stateRef = useRef({
    isDragging,
    dragStartIdx,
    dragEndIdx,
    dragTargetStatus,
    selectedDate,
    participantTimeStatuses,
  });

  useEffect(() => {
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
        const slotStart = new Date(date);
        slotStart.setHours(hour, 0, 0, 0);
        const slotEnd = new Date(date);
        slotEnd.setHours(hour + 1, 0, 0, 0);

        let availableCount = 0;
        let myStatus: 'POSSIBLE' | 'IMPOSSIBLE' | 'UNSET' = 'UNSET';

        const availableParticipants: string[] = [];
        const unavailableParticipants: string[] = [];

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
          if (todayStatus && todayStatus.impossibleSlots?.includes(hour)) {
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

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleMouseUp();
      }
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
    // 일별 뷰로 전환 시 해당 날짜의 슬롯을 미리 로드
    setSlots(generateDailySchedule(date));
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

  const handleSlotToggle = async (
    time: string,
    currentStatus: 'POSSIBLE' | 'IMPOSSIBLE' | 'UNSET'
  ) => {
    if (!selectedDate || !currentParticipant) return;

    const newStatus: 'POSSIBLE' | 'IMPOSSIBLE' =
      currentStatus === 'POSSIBLE' ? 'IMPOSSIBLE' : 'POSSIBLE';

    const [hour] = time.split(':').map(Number);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    const payload: AvailabilitySlotUpdatePayload[] = [
      {
        date: dateStr,
        slots: [hour],
        status: newStatus,
      },
    ];

    try {
      await patchParticipantAvailability(meeting.id, payload);

      const updatedParticipant = { ...currentParticipant };
      const statusIndex = updatedParticipant.timeStatuses?.findIndex(
        (ts) => ts.date === dateStr
      );

      if (statusIndex !== undefined && statusIndex >= 0) {
        const existingStatus =
          updatedParticipant.timeStatuses![statusIndex].impossibleSlots || [];
        if (newStatus === 'IMPOSSIBLE') {
          updatedParticipant.timeStatuses![statusIndex].impossibleSlots = [
            ...existingStatus,
            hour,
          ];
        } else {
          updatedParticipant.timeStatuses![statusIndex].impossibleSlots =
            existingStatus.filter((s) => s !== hour);
        }
      } else {
        if (!updatedParticipant.timeStatuses)
          updatedParticipant.timeStatuses = [];
        updatedParticipant.timeStatuses.push({
          date: dateStr,
          impossibleSlots: newStatus === 'IMPOSSIBLE' ? [hour] : [],
          status: 'IMPOSSIBLE',
        });
      }

      setSlots((prevSlots) =>
        prevSlots.map((s) =>
          s.time === time ? { ...s, myStatus: newStatus } : s
        )
      );

      await loadDailyAvailability();
    } catch (error) {
      console.error('Failed to update availability', error);
      toast({
        title: '업데이트 실패',
        description: '일정을 업데이트하지 못했습니다.',
        variant: 'destructive',
      });
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

  // 드래그 종료 시 슬롯 번호 요청
  const handleMouseUp = async () => {
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
    const end = Math.max(dragEndIdx, dragStartIdx);
    const selectedSlots: number[] = [];

    for (let i = start; i <= end; i++) {
      if (slots[i]?.isCandidate) {
        const [hour] = slots[i].time.split(':').map(Number);
        selectedSlots.push(hour);
      }
    }

    if (selectedSlots.length === 0) {
      setIsDragging(false);
      return;
    }

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const payload: AvailabilitySlotUpdatePayload[] = [
      {
        date: dateStr,
        slots: selectedSlots,
        status: dragTargetStatus,
      },
    ];

    try {
      await patchParticipantAvailability(meeting.id, payload);

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

  const monthDays = Array.from({
    length: endOfMonth(currentMonth).getDate(),
  }).map((_, i) => {
    const date = addDays(startOfMonth(currentMonth), i);
    const startOfViewWeek = startOfWeek(date, { locale: ko });
    const startOfCurrentMonth = startOfMonth(currentMonth);

    // If the current day is before the start of the month, add days to the previous week
    if (date < startOfCurrentMonth) {
      return addDays(date, 7 - (date.getDay() === 0 ? 7 : date.getDay()));
    }
    return date;
  });

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
    const currentSlots = generateDailySchedule(selectedDate);

    return (
      <Card className="flex h-full flex-col overflow-hidden shadow-lg border-0 sm:border">
        <div className="flex items-center justify-between border-b p-4 bg-card shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToMonth}
              className="gap-1 hover:bg-accent text-foreground"
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="text-lg font-bold">
                {format(selectedDate, 'M월 d일 (E)', { locale: ko })}
              </span>
            </Button>
          </div>
          <div className="flex items-center gap-3 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
              <span>가능</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-rose-400 rounded-sm" />
              <span>불가능</span>
            </div>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto relative"
          ref={scrollRef}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div className="relative">
            {/* 시간대 레이블들 - 1시부터 23시까지 */}
            {Array.from({ length: 23 }).map((_, idx) => {
              const hour = idx + 1; // 1시부터 시작
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
                  const end = Math.max(dragEndIdx, dragStartIdx);
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
                      'h-14 border-t border-border/30 relative flex items-center transition-colors select-none',
                      slot.isCandidate
                        ? 'cursor-pointer hover:opacity-90'
                        : 'bg-muted/10 cursor-not-allowed opacity-50',
                      isDragging &&
                        dragStartIdx !== null &&
                        dragEndIdx !== null &&
                        index >= Math.min(dragStartIdx, dragEndIdx) &&
                        index <= Math.max(dragEndIdx, dragStartIdx) &&
                        slot.isCandidate
                        ? 'ring-2 ring-primary ring-inset'
                        : ''
                    )}
                  >
                    {/* 가능 영역 */}
                    {slot.isCandidate && slot.availableCount > 0 && (
                      <div
                        className="absolute left-0 top-0 bottom-0 bg-teal-50 dark:bg-teal-900/40 transition-all duration-300 flex items-center justify-start px-3"
                        style={{ width: `${availableRatio * 100}%` }}
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-teal-700 dark:text-teal-300">
                            {slot.availableCount}명 가능
                          </span>
                          {slotWithParticipants.availableParticipants &&
                            slotWithParticipants.availableParticipants.length >
                              0 && (
                              <span className="text-[10px] text-teal-600 dark:text-teal-400">
                                {slotWithParticipants.availableParticipants.join(
                                  ', '
                                )}
                              </span>
                            )}
                        </div>
                      </div>
                    )}

                    {/* 불가능 영역 */}
                    {slot.isCandidate &&
                      slot.totalParticipants - slot.availableCount > 0 && (
                        <div
                          className="absolute top-0 bottom-0 bg-pink-50 dark:bg-pink-900/30 transition-all duration-300 flex items-center justify-start px-3 pr-24"
                          style={{
                            right: 0,
                            width: `${unavailableRatio * 100}%`,
                          }}
                        >
                          <div className="flex flex-col items-start">
                            <span className="text-xs font-bold text-pink-700 dark:text-pink-300">
                              {slot.totalParticipants - slot.availableCount}명
                              불가
                            </span>
                            {slotWithParticipants.unavailableParticipants &&
                              slotWithParticipants.unavailableParticipants
                                .length > 0 && (
                                <span className="text-[10px] text-pink-600 dark:text-pink-400">
                                  {slotWithParticipants.unavailableParticipants.join(
                                    ', '
                                  )}
                                </span>
                              )}
                          </div>
                        </div>
                      )}

                    {/* 내 참여 상태 뱃지 */}
                    <div className="absolute right-2 flex items-center gap-2 z-10 pointer-events-none">
                      {isAvailable && (
                        <div className="flex items-center gap-1 text-teal-700 dark:text-teal-300 bg-teal-100/95 dark:bg-teal-900/80 px-2 py-1 rounded-full shadow-sm">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-xs font-bold">참여 가능</span>
                        </div>
                      )}
                      {isUnavailable && (
                        <div className="flex items-center gap-1 text-rose-700 bg-rose-100/95 dark:bg-rose-900/80 px-2 py-1 rounded-full shadow-sm">
                          <div className="w-2 h-2 rounded-full bg-rose-500" />
                          <span className="text-xs font-bold">참여 불가</span>
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
