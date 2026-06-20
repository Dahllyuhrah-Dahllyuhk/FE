'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { format, isToday, addMonths, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Lock, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  patchParticipantAvailability,
  type AvailabilitySlotUpdatePayload,
} from '@/lib/api';
import type {
  Meeting,
  TimeSlotAvailability,
  ParticipantTimeStatus,
  MeetingParticipant,
} from '@/types/meeting';
import { toast } from '@/hooks/use-toast';
import { buildMonthGrid } from '@/lib/helpers';

interface MeetingCalendarProps {
  meeting: Meeting;
  currentUserEmail?: string;
  currentUserId?: string;
  readonly?: boolean;
}

const buildPatchPayloadForSlots = (
  selectedDate: Date,
  slots: number[],
  status: 'POSSIBLE' | 'IMPOSSIBLE'
): AvailabilitySlotUpdatePayload[] => {
  if (slots.length === 0) return [];
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  return [{ date: dateStr, slots: Array.from(new Set(slots)).sort((a, b) => a - b), status }];
};

export function MeetingCalendar({
  meeting,
  currentUserId,
  readonly = false,
}: MeetingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<'month' | 'day'>('month');

  // 로컬 participant 상태 - PATCH 후 즉각 반영용
  const [localParticipant, setLocalParticipant] = useState<MeetingParticipant | null>(null);

  const [slots, setSlots] = useState<TimeSlotAvailability[]>([]);

  // 일 뷰 드래그
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartIdx, setDragStartIdx] = useState<number | null>(null);
  const [dragEndIdx, setDragEndIdx] = useState<number | null>(null);
  const [dragTargetStatus, setDragTargetStatus] = useState<'POSSIBLE' | 'IMPOSSIBLE' | null>(null);
  // 드래그 상태 ref - 짧은 탭(touchstart→touchend) 시 state 커밋 전 handleMouseUp이 stale 값을 읽는 race 방지
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<number | null>(null);
  const dragEndRef = useRef<number | null>(null);
  const dragTargetRef = useRef<'POSSIBLE' | 'IMPOSSIBLE' | null>(null);
  // 일 뷰 모바일 토글
  const [dayDragMode, setDayDragMode] = useState(false);

  // 월 뷰 드래그
  const [monthDragging, setMonthDragging] = useState(false);
  const [monthDragDates, setMonthDragDates] = useState<Set<string>>(new Set());
  const [monthDragTarget, setMonthDragTarget] = useState<'POSSIBLE' | 'IMPOSSIBLE'>('POSSIBLE');
  const monthDragRef = useRef(false);
  const monthDragStarted = useRef(false);
  const monthMouseDownDate = useRef<Date | null>(null);
  // 월 뷰 모바일 토글
  const [monthDragMode, setMonthDragMode] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const currentParticipant = localParticipant ??
    meeting.participants?.find((p) => p.userId === currentUserId) ?? null;

  const todayStatus = currentParticipant?.timeStatuses?.find(
    (ts) => selectedDate && ts.date === format(selectedDate, 'yyyy-MM-dd')
  );

  const totalParticipants = meeting.participants?.length || 0;

  // meeting.participants 변경 시 로컬 상태 동기화
  useEffect(() => {
    const p = meeting.participants?.find((p) => p.userId === currentUserId);
    if (p) setLocalParticipant({ ...p, timeStatuses: [...(p.timeStatuses || [])] });
  }, [meeting.participants, currentUserId]);

  const generateDailySchedule = useCallback(
    (date: Date, overrideParticipant?: MeetingParticipant | null): TimeSlotAvailability[] => {
      const result: TimeSlotAvailability[] = [];
      const dateStr = format(date, 'yyyy-MM-dd');
      const effectiveParticipant = overrideParticipant !== undefined ? overrideParticipant : currentParticipant;
      const effectiveTodayStatus = effectiveParticipant?.timeStatuses?.find(ts => ts.date === dateStr);

      for (let hour = 0; hour < 24; hour++) {
        const time = `${hour.toString().padStart(2, '0')}:00`;
        let availableCount = 0;
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
            if (participant.status === 'PENDING') return;
            const ts = participant.userId === currentUserId
              ? effectiveTodayStatus
              : participant.timeStatuses?.find((t) => t.date === dateStr);
            if (ts && ts.impossibleSlots?.includes(hour)) {
              unavailableParticipants.push(participant.name);
            } else {
              availableCount++;
              availableParticipants.push(participant.name);
            }
          });
        }

        let myStatus: 'POSSIBLE' | 'IMPOSSIBLE' | 'UNSET' = 'UNSET';
        if (effectiveParticipant && isCandidate) {
          if (effectiveParticipant.status === 'PENDING') {
            myStatus = 'UNSET';
          } else if (effectiveTodayStatus && effectiveTodayStatus.impossibleSlots?.includes(hour)) {
            myStatus = 'IMPOSSIBLE';
          } else {
            myStatus = 'POSSIBLE';
          }
        }

        result.push({ time, availableCount, totalParticipants, isCandidate, myStatus, availableParticipants, unavailableParticipants } as any);
      }
      return result;
    },
    [meeting, currentParticipant, todayStatus, totalParticipants, currentUserId]
  );

  useEffect(() => {
    const initialDate = new Date(meeting.requirement.dateRangeStart);
    setCurrentMonth(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  }, [meeting.id]);

  useEffect(() => {
    if (view === 'day' && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: 540 });
      }, 100);
    }
  }, [view]);

  const getDailyStats = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const totalCount = meeting.participants?.length || meeting.invitedUserIds?.length || 0;

    if (!meeting.participants || meeting.participants.length === 0) {
      return { availableCount: 0, totalParticipants: totalCount, isFullyAvailable: false };
    }

    const candidateHours: number[] = [];
    if (meeting.requirement.isAllDay || meeting.requirement.timeConstraints.length === 0) {
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

    // 후보 시간대별로 '동시에 가능한 인원수'를 구해 그 날의 최댓값을 사용한다.
    // (일간 화면의 시간대별 교집합 기준과 일치 — 전원이 동시에 되는 시간이 있어야 '전원 가능')
    const acceptedParticipants = meeting.participants.filter((p) => p.status !== 'PENDING');
    const pendingCount = meeting.participants.length - acceptedParticipants.length;

    let availableCount = 0;
    candidateHours.forEach((hour) => {
      let simultaneous = 0;
      acceptedParticipants.forEach((participant) => {
        const effectiveTs = participant.userId === currentUserId
          ? localParticipant?.timeStatuses?.find((t) => t.date === dateKey)
          : participant.timeStatuses?.find((t) => t.date === dateKey);
        const impossibleSlots = effectiveTs?.impossibleSlots || [];
        if (!impossibleSlots.includes(hour)) simultaneous++;
      });
      if (simultaneous > availableCount) availableCount = simultaneous;
    });

    return {
      availableCount,
      totalParticipants: totalCount,
      isFullyAvailable: availableCount === totalCount && totalCount > 0 && pendingCount === 0,
    };
  };

  const isDateInRange = (date: Date) => {
    const start = new Date(meeting.requirement.dateRangeStart);
    const end = new Date(meeting.requirement.dateRangeEnd);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return date >= start && date <= end;
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
  };

  // ── 월 뷰: localParticipant 즉각 반영 헬퍼 ──
  const applyMonthDragLocally = (dates: string[], target: 'POSSIBLE' | 'IMPOSSIBLE', candidateSlotsMap: Record<string, number[]>) => {
    setLocalParticipant(prev => {
      if (!prev) return prev;
      const updated = { ...prev, timeStatuses: [...(prev.timeStatuses || [])] };
      dates.forEach(dateStr => {
        const slotList = candidateSlotsMap[dateStr] || [];
        const idx = updated.timeStatuses.findIndex(ts => ts.date === dateStr);
        if (idx >= 0) {
          let existing = [...(updated.timeStatuses[idx].impossibleSlots || [])];
          if (target === 'IMPOSSIBLE') {
            existing = Array.from(new Set([...existing, ...slotList]));
          } else {
            existing = existing.filter(s => !slotList.includes(s));
          }
          updated.timeStatuses[idx] = { ...updated.timeStatuses[idx], impossibleSlots: existing };
        } else if (target === 'IMPOSSIBLE' && slotList.length > 0) {
          updated.timeStatuses.push({ date: dateStr, impossibleSlots: slotList, status: 'IMPOSSIBLE' });
        }
      });
      return updated;
    });
  };

  const getMonthCandidateSlots = (): number[] => {
    const result: number[] = [];
    if (meeting.requirement.isAllDay || meeting.requirement.timeConstraints.length === 0) {
      for (let h = 0; h < 24; h++) result.push(h);
    } else {
      meeting.requirement.timeConstraints.forEach(tc => {
        const [startH] = tc.startTime.split(':').map(Number);
        const [endH] = tc.endTime.split(':').map(Number);
        for (let h = startH; h < endH; h++) {
          if (!result.includes(h)) result.push(h);
        }
      });
    }
    return result;
  };

  // ── 월 뷰 드래그 핸들러 ──
  const handleMonthDateMouseDown = (date: Date, isMobile: boolean) => {
    if (readonly) return;
    if (isMobile && !monthDragMode) return;
    monthDragRef.current = true;
    monthDragStarted.current = false;
    monthMouseDownDate.current = date;

    const dateStr = format(date, 'yyyy-MM-dd');
    const ts = localParticipant?.timeStatuses?.find(t => t.date === dateStr);
    const hasImpossible = ts && ts.impossibleSlots && ts.impossibleSlots.length > 0;
    const target: 'POSSIBLE' | 'IMPOSSIBLE' = hasImpossible ? 'POSSIBLE' : 'IMPOSSIBLE';
    setMonthDragTarget(target);
    setMonthDragDates(new Set([dateStr]));
  };

  const handleMonthDateMouseEnter = (date: Date) => {
    if (!monthDragRef.current) return;
    if (!isDateInRange(date)) return;
    monthDragStarted.current = true;
    setMonthDragging(true);
    const dateStr = format(date, 'yyyy-MM-dd');
    setMonthDragDates(prev => new Set([...prev, dateStr]));
  };

  const handleMonthDateMouseUp = async (clickedDate?: Date) => {
    if (!monthDragRef.current) return;

    const wasDrag = monthDragStarted.current;
    monthDragRef.current = false;
    monthDragStarted.current = false;
    setMonthDragging(false);

    // PC 단순 클릭 → 일 뷰 이동
    if (!wasDrag && clickedDate && !monthDragMode) {
      setMonthDragDates(new Set());
      handleDateClick(clickedDate);
      return;
    }

    const dates = Array.from(monthDragDates);
    setMonthDragDates(new Set());
    if (dates.length === 0) return;

    const candidateSlots = getMonthCandidateSlots();
    if (candidateSlots.length === 0) return;

    const candidateSlotsMap: Record<string, number[]> = {};
    dates.forEach(d => { candidateSlotsMap[d] = candidateSlots; });

    // 즉각 로컬 반영
    applyMonthDragLocally(dates, monthDragTarget, candidateSlotsMap);

    try {
      for (const dateStr of dates) {
        const payloads = buildPatchPayloadForSlots(
          new Date(dateStr + 'T12:00:00'),
          candidateSlots,
          monthDragTarget
        );
        for (const payload of payloads) {
          await patchParticipantAvailability(meeting.id, [payload]);
        }
      }
      toast({ title: `${dates.length}일 일정이 업데이트되었습니다.` });
    } catch {
      const p = meeting.participants?.find(p => p.userId === currentUserId);
      if (p) setLocalParticipant({ ...p, timeStatuses: [...(p.timeStatuses || [])] });
      toast({ title: '일정 업데이트에 실패했습니다.', variant: 'destructive' });
    }
  };

  // ── 일 뷰 드래그 핸들러 ──
  const resetDayDrag = () => {
    isDraggingRef.current = false;
    dragStartRef.current = null;
    dragEndRef.current = null;
    dragTargetRef.current = null;
    setIsDragging(false);
    setDragStartIdx(null);
    setDragEndIdx(null);
    setDragTargetStatus(null);
  };

  const handleMouseDown = (index: number, status: 'POSSIBLE' | 'IMPOSSIBLE' | 'UNSET') => {
    if (readonly) return;
    const target: 'POSSIBLE' | 'IMPOSSIBLE' =
      status === 'POSSIBLE' || status === 'UNSET' ? 'IMPOSSIBLE' : 'POSSIBLE';
    // ref에 동기 반영 (탭처럼 짧은 동작에서도 handleMouseUp이 최신값을 읽도록)
    isDraggingRef.current = true;
    dragStartRef.current = index;
    dragEndRef.current = index;
    dragTargetRef.current = target;
    setIsDragging(true);
    setDragStartIdx(index);
    setDragEndIdx(index);
    setDragTargetStatus(target);
  };

  const handleMouseEnter = (index: number) => {
    if (isDraggingRef.current && !readonly) {
      dragEndRef.current = index;
      setDragEndIdx(index);
    }
  };

  const handleMouseUp = async () => {
    if (readonly) { resetDayDrag(); return; }
    const startIdx = dragStartRef.current;
    const endIdx = dragEndRef.current;
    const target = dragTargetRef.current;
    if (!isDraggingRef.current || startIdx === null || endIdx === null || !target || !selectedDate || !currentParticipant) {
      resetDayDrag();
      return;
    }

    const start = Math.min(startIdx, endIdx);
    const end = Math.max(startIdx, endIdx);
    const currentSlots = generateDailySchedule(selectedDate);
    const selectedSlotNums: number[] = [];

    for (let i = start; i <= end; i++) {
      if (currentSlots[i]?.isCandidate) {
        const [hour] = currentSlots[i].time.split(':').map(Number);
        selectedSlotNums.push(hour);
      }
    }

    if (selectedSlotNums.length === 0) {
      resetDayDrag();
      return;
    }

    const payloads = buildPatchPayloadForSlots(selectedDate, selectedSlotNums, target);

    // 즉각 로컬 반영
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    setLocalParticipant(prev => {
      if (!prev) return prev;
      const updated = { ...prev, timeStatuses: [...(prev.timeStatuses || [])] };
      const idx = updated.timeStatuses.findIndex(ts => ts.date === dateStr);
      if (idx >= 0) {
        let existing = [...(updated.timeStatuses[idx].impossibleSlots || [])];
        if (target === 'IMPOSSIBLE') {
          existing = Array.from(new Set([...existing, ...selectedSlotNums]));
        } else {
          existing = existing.filter(s => !selectedSlotNums.includes(s));
        }
        updated.timeStatuses[idx] = { ...updated.timeStatuses[idx], impossibleSlots: existing };
      } else if (target === 'IMPOSSIBLE') {
        updated.timeStatuses.push({ date: dateStr, impossibleSlots: selectedSlotNums, status: 'IMPOSSIBLE' });
      }
      return updated;
    });

    setSlots(prev => prev.map((s, idx) => {
      if (idx >= start && idx <= end && s.isCandidate) return { ...s, myStatus: target };
      return s;
    }));

    try {
      for (const payload of payloads) {
        await patchParticipantAvailability(meeting.id, [payload]);
      }
    } catch {
      const p = meeting.participants?.find(p => p.userId === currentUserId);
      if (p) setLocalParticipant({ ...p, timeStatuses: [...(p.timeStatuses || [])] });
      toast({ title: '시간 업데이트에 실패했습니다.', variant: 'destructive' });
    } finally {
      resetDayDrag();
    }
  };

  // ── 렌더: 월 뷰 ──
  const renderMonthView = () => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const grid = buildMonthGrid(y, m);

    return (
      <Card className="flex flex-col overflow-hidden shadow-lg select-none h-full">
        {readonly && (
          <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-700 dark:text-amber-300">읽기 전용 모드</span>
          </div>
        )}

        {/* 헤더: 월 네비게이션 + 모바일 전용 토글 */}
        <div className="flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5 p-3 shrink-0">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="hover:bg-primary/10">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-bold text-foreground flex-1 text-center">
            {format(currentMonth, 'yyyy년 M월', { locale: ko })}
          </h2>
          {/* 모바일 전용 드래그 모드 토글 */}
          {!readonly && (
            <div className="flex items-center gap-1.5 sm:hidden">
              <CalendarDays className={cn('h-3.5 w-3.5', monthDragMode ? 'text-primary' : 'text-muted-foreground')} />
              <Switch
                checked={monthDragMode}
                onCheckedChange={(v) => { setMonthDragMode(v); setMonthDragDates(new Set()); }}
              />
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={handleNextMonth} className="hover:bg-primary/10">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* 모바일 드래그 모드 안내 배너 */}
        {!readonly && monthDragMode && (
          <div className="sm:hidden px-3 py-1.5 bg-primary/5 border-b border-primary/20 text-center">
            <span className="text-[11px] text-primary font-medium">드래그로 여러 날짜 참석 여부를 한 번에 설정</span>
          </div>
        )}

        <div className="flex-1 p-2 sm:p-3 flex flex-col">
          <div className="mb-2 grid grid-cols-7 gap-1 text-center">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
              <div key={day} className={cn('text-xs sm:text-sm font-bold',
                idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-muted-foreground'
              )}>{day}</div>
            ))}
          </div>

          <div
            className="flex-1 flex flex-col gap-1"
            onMouseUp={() => { if (monthDragRef.current) handleMonthDateMouseUp(); }}
            onMouseLeave={() => { if (monthDragRef.current) handleMonthDateMouseUp(); }}
          >
            {grid.map((week, weekIdx) => (
              <div key={`week-${weekIdx}`} className="grid grid-cols-7 gap-1 flex-1">
                {week.map((date, colIdx) => {
                  if (!date) return <div key={`empty-${colIdx}`} className="min-h-0" />;

                  const isInRange = isDateInRange(date);
                  const dayNum = date.getDay();
                  const stats = getDailyStats(date);
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const isDragHighlighted = monthDragging && monthDragDates.has(dateStr) && isInRange;

                  return (
                    <button
                      key={date.toISOString()}
                      data-date={dateStr}
                      disabled={!isInRange}
                      onMouseDown={(e) => {
                        if (!isInRange) return;
                        e.preventDefault();
                        handleMonthDateMouseDown(date, false);
                      }}
                      onMouseEnter={() => handleMonthDateMouseEnter(date)}
                      onMouseUp={() => isInRange && handleMonthDateMouseUp(date)}
                      onTouchStart={(e) => {
                        if (!isInRange || !monthDragMode) return;
                        e.preventDefault();
                        handleMonthDateMouseDown(date, true);
                      }}
                      onTouchMove={(e) => {
                        if (!monthDragMode) return;
                        e.preventDefault();
                        const touch = e.touches[0];
                        const el = document.elementFromPoint(touch.clientX, touch.clientY);
                        const ds = el?.getAttribute('data-date');
                        if (ds) handleMonthDateMouseEnter(new Date(ds + 'T12:00:00'));
                      }}
                      onTouchEnd={() => handleMonthDateMouseUp()}
                      className={cn(
                        'flex flex-col items-center justify-center rounded-lg text-xs sm:text-sm font-medium transition-all min-h-[52px] sm:min-h-[64px]',
                        isToday(date) && 'ring-2 ring-primary',
                        isInRange
                          ? monthDragMode
                            ? 'cursor-crosshair hover:opacity-80 sm:cursor-pointer'
                            : 'hover:bg-primary/20 cursor-pointer'
                          : 'opacity-40 cursor-not-allowed',
                        isDragHighlighted
                          ? monthDragTarget === 'IMPOSSIBLE'
                            ? 'ring-2 ring-rose-400 ring-inset brightness-90'
                            : 'ring-2 ring-emerald-400 ring-inset brightness-110'
                          : '',
                        stats.isFullyAvailable && isInRange
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : stats.availableCount > 0 && isInRange
                          ? 'bg-yellow-100 dark:bg-yellow-900/30'
                          : isInRange
                          ? 'bg-gray-300/80 dark:bg-gray-600/80'
                          : ''
                      )}
                    >
                      <span className={cn('font-semibold',
                        dayNum === 0 ? 'text-red-500' : dayNum === 6 ? 'text-blue-500' : ''
                      )}>{date.getDate()}</span>
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
          {!readonly && (
            <p className="hidden sm:block mt-2 text-[11px] text-center text-muted-foreground">
              클릭하면 일 화면으로 이동 · 드래그하면 여러 날짜 참석 여부를 한 번에 설정
            </p>
          )}
        </div>
      </Card>
    );
  };

  // ── 렌더: 일 뷰 ──
  const renderDayView = () => {
    if (!selectedDate) return null;
    const currentSlots = generateDailySchedule(selectedDate);

    return (
      <Card className="flex flex-col shadow-lg h-full relative pt-0">
        {readonly && (
          <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-700 dark:text-amber-300">읽기 전용 모드</span>
          </div>
        )}

        {/* 헤더 - 사각 불투명 마스크(bg-background)가 슬롯을 가리고, 그 위에 둥근 그라데이션 헤더 하나.
            여백은 헤더 자체의 위쪽 패딩(pt-5)으로 흡수해 일체화 */}
        <div className="sticky top-0 z-20 shrink-0 bg-background">
          <div className="flex items-center justify-between rounded-t-xl bg-card bg-gradient-to-r from-primary/10 to-primary/5 p-3 pt-5">
            <Button variant="ghost" size="icon" onClick={handleBackToMonth} className="hover:bg-primary/10">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-bold text-foreground">
              {format(selectedDate, 'M월 d일 (E)', { locale: ko })}
            </h2>
            <div className="w-10" />
          </div>
        </div>

        {/* 슬롯 영역 - 스크롤은 외부 main이 담당 (단일 스크롤) */}
        <div
          className="relative"
          ref={scrollRef}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div className="relative">
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

            <div className="pl-16 border-l">
              {currentSlots.map((slot, index) => {
                let isAvailable = slot.myStatus === 'POSSIBLE';
                let isUnavailable = slot.myStatus === 'IMPOSSIBLE';

                if (isDragging && dragStartIdx !== null && dragEndIdx !== null && dragTargetStatus) {
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
                const availableRatio = slot.totalParticipants > 0 ? slot.availableCount / slot.totalParticipants : 0;
                const unavailableRatio = 1 - availableRatio;
                const unavailableCount = slot.totalParticipants - slot.availableCount;

                return (
                  <div
                    key={index}
                    onMouseDown={(e) => {
                      if (slot.isCandidate && !readonly) {
                        e.preventDefault();
                        handleMouseDown(index, slot.myStatus);
                      }
                    }}
                    onMouseEnter={() => handleMouseEnter(index)}
                    onTouchStart={(e) => {
                      if (!slot.isCandidate || readonly || !dayDragMode) return;
                      e.preventDefault();
                      handleMouseDown(index, slot.myStatus);
                    }}
                    onTouchMove={(e) => {
                      if (!dayDragMode || readonly) return;
                      e.preventDefault();
                      if (!scrollRef.current) return;
                      const touch = e.touches[0];
                      const containerRect = scrollRef.current.getBoundingClientRect();
                      const scrollTop = scrollRef.current.scrollTop;
                      const relativeY = touch.clientY - containerRect.top + scrollTop;
                      const SLOT_HEIGHT = 56;
                      const calculatedIdx = Math.floor(relativeY / SLOT_HEIGHT);
                      const clampedIdx = Math.max(0, Math.min(23, calculatedIdx));
                      handleMouseEnter(clampedIdx);
                    }}
                    onTouchEnd={(e) => {
                      // 탭 후 합성 마우스/클릭 이벤트가 발생해 한 번 더 토글 → 상쇄되는 현상 방지
                      e.preventDefault();
                      handleMouseUp();
                    }}
                    data-slot-index={index}
                    className={cn(
                      'h-14 border-t border-border/30 relative flex items-center transition-colors select-none',
                      // 다중 선택 ON 시 슬롯 위 터치는 스크롤 대신 드래그 선택 (왼쪽 라벨 영역은 제외되어 스크롤 유지)
                      dayDragMode && !readonly && 'touch-none',
                      slot.isCandidate
                        ? readonly ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:opacity-90'
                        : 'bg-muted/10 cursor-not-allowed opacity-50',
                      isDragging && dragStartIdx !== null && dragEndIdx !== null &&
                        index >= Math.min(dragStartIdx, dragEndIdx) &&
                        index <= Math.max(dragStartIdx, dragEndIdx) && slot.isCandidate
                        ? 'ring-2 ring-primary ring-inset' : ''
                    )}
                  >
                    {slot.isCandidate && slot.availableCount > 0 && (
                      <div
                        className="absolute left-0 top-0 bottom-0 bg-teal-50 dark:bg-teal-900/40 transition-all duration-300 flex items-center justify-start px-2 sm:px-3 overflow-hidden"
                        style={{ width: `${availableRatio * 100}%` }}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-teal-700 dark:text-teal-300 whitespace-nowrap">{slot.availableCount}명 가능</span>
                          {slotWithParticipants.availableParticipants && slotWithParticipants.availableParticipants.length > 0 && (
                            <span className="text-[10px] text-teal-600 dark:text-teal-400 truncate max-w-full">
                              {slotWithParticipants.availableParticipants.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {slot.isCandidate && unavailableCount > 0 && (
                      <div
                        className="absolute top-0 bottom-0 bg-pink-50 dark:bg-pink-900/30 transition-all duration-300 flex items-center justify-start px-2 sm:px-3 overflow-hidden"
                        style={{ right: 0, width: `${unavailableRatio * 100}%`, paddingRight: '80px' }}
                      >
                        <div className="flex flex-col items-start min-w-0">
                          <span className="text-xs font-bold text-pink-700 dark:text-pink-300 whitespace-nowrap">{unavailableCount}명 불가</span>
                          {slotWithParticipants.unavailableParticipants && slotWithParticipants.unavailableParticipants.length > 0 && (
                            <span className="text-[10px] text-pink-600 dark:text-pink-400 truncate max-w-full">
                              {slotWithParticipants.unavailableParticipants.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="absolute right-2 flex items-center gap-2 z-10 pointer-events-none">
                      {isAvailable && (
                        <div className="flex items-center gap-1 text-teal-700 dark:text-teal-300 bg-teal-100/95 dark:bg-teal-900/80 px-2 py-1 rounded-full shadow-sm">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-xs font-bold hidden sm:inline">참여 가능</span>
                        </div>
                      )}
                      {isUnavailable && (
                        <div className="flex items-center gap-1 text-rose-700 bg-rose-100/95 dark:bg-rose-900/80 px-2 py-1 rounded-full shadow-sm">
                          <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                          <span className="text-xs font-bold hidden sm:inline">참여 불가</span>
                        </div>
                      )}
                    </div>
                    {isAvailable && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500 z-10" />}
                    {isUnavailable && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-500 z-10" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 모바일 전용 고정 드래그 토글 */}
        {!readonly && (
          <div className={cn(
            'sm:hidden fixed bottom-20 right-4 z-50',
            'flex items-center gap-2 px-3 py-2 rounded-full shadow-lg border',
            dayDragMode
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background text-foreground border-border'
          )}>
            <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="text-xs font-medium whitespace-nowrap">다중 선택</span>
            <Switch
              checked={dayDragMode}
              onCheckedChange={setDayDragMode}
              className="scale-75"
            />
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="w-full h-full">
      {view === 'month' ? renderMonthView() : renderDayView()}
    </div>
  );
}
