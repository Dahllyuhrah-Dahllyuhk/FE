import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
} from 'date-fns';
import { ko } from 'date-fns/locale';

/**
 * 월간 캘린더 그리드 생성
 * @param year 연도
 * @param month 월 (0-11)
 * @returns 주별로 구성된 날짜 배열 (빈 칸은 null)
 */
export function buildMonthGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = startOfMonth(new Date(year, month, 1));
  const lastDay = endOfMonth(firstDay);

  // 달력의 첫 주 시작일 (일요일 기준)
  const calendarStart = startOfWeek(firstDay, { locale: ko });
  // 달력의 마지막 주 종료일
  const calendarEnd = endOfWeek(lastDay, { locale: ko });

  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = [];
  let currentDate = calendarStart;

  while (currentDate <= calendarEnd) {
    // 현재 월에 속하지 않는 날짜는 null 처리
    if (currentDate.getMonth() !== month) {
      currentWeek.push(null);
    } else {
      currentWeek.push(new Date(currentDate));
    }

    // 주가 완성되면 weeks에 추가
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }

    currentDate = addDays(currentDate, 1);
  }

  // 마지막 주가 남아있다면 추가
  if (currentWeek.length > 0) {
    // 7일이 안 되면 null로 채움
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  return weeks;
}
