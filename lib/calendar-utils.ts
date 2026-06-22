/** 서버 원본 → 캘린더 이벤트로 매핑 */
export function mapRawToCalendarEvent(raw: any, idx: number) {
  const palette = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-green-500',
    'bg-orange-500',
    'bg-pink-500',
  ];

  // 서버 색이 없을 때의 fallback 색은 이벤트 id로부터 결정적으로 계산한다.
  // (배열 인덱스 기반이면 이벤트 추가/삭제 시 순서가 밀려 다른 이벤트 색이 바뀌는 버그가 생김)
  const stableIndex = (id: unknown): number => {
    const s = String(id ?? '');
    if (s.length === 0) return idx; // id가 없으면 기존 동작(인덱스) 유지
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  };

  const serverColor: string | undefined = raw.color ?? undefined;
  const baseColor =
    serverColor && serverColor.trim().length > 0
      ? serverColor.trim()
      : palette[stableIndex(raw.id) % palette.length];

  // allDay인 경우: 날짜 문자열을 신뢰해 로컬 자정으로 변환
  if (raw.allDay) {
    const startStr: string | undefined = raw.start;
    const endStr: string | undefined = raw.end;

    // 안전장치: 없으면 timestamp로부터 보정 (fallback)
    const startLocal = startStr
      ? new Date(`${startStr}T00:00:00`)
      : new Date(
          new Date(raw.startTimestamp ?? Number.NaN).getFullYear(),
          new Date(raw.startTimestamp ?? Number.NaN).getMonth(),
          new Date(raw.startTimestamp ?? Number.NaN).getDate(),
          0,
          0,
          0,
          0
        );

    const endExclusiveLocal = endStr
      ? new Date(`${endStr}T00:00:00`)
      : new Date(
          new Date(raw.endTimestamp ?? Number.NaN).getFullYear(),
          new Date(raw.endTimestamp ?? Number.NaN).getMonth(),
          new Date(raw.endTimestamp ?? Number.NaN).getDate(),
          0,
          0,
          0,
          0
        );

    // 화면 표시용 end는 inclusive로 1ms 빼서 저장
    const endInclusiveLocal = new Date(endExclusiveLocal.getTime() - 1);

    return {
      id: raw.id,
      title: raw.title ?? 'Untitled',
      description: raw.description ?? '',
      startDate: startLocal,
      endDate: endInclusiveLocal,
      allDay: true,
      color: baseColor,
    };
  }

  // 시간 기반 이벤트 (기존 로직)
  const startMs =
    typeof raw.startTimestamp === 'number'
      ? raw.startTimestamp
      : raw.start
      ? Date.parse(raw.start)
      : Number.NaN;
  const endMs =
    typeof raw.endTimestamp === 'number'
      ? raw.endTimestamp
      : raw.end
      ? Date.parse(raw.end)
      : Number.NaN;

  return {
    id: raw.id,
    title: raw.title ?? 'Untitled',
    description: raw.description ?? '',
    startDate: new Date(startMs),
    endDate: new Date(endMs),
    allDay: !!raw.allDay,
    color: baseColor,
  };
}

/** 한 달 캘린더 셀(week x 7) 생성 */
export function buildMonthGrid(y: number, m: number): (Date | null)[][] {
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const daysCount = last.getDate();
  const startDay = first.getDay(); // Sun(0)~Sat(6)

  const totalCells = startDay + daysCount;
  const totalRows = Math.ceil(totalCells / 7);

  const calendarGrid: (Date | null)[][] = [];
  let dayCounter = 1;
  for (let row = 0; row < totalRows; row++) {
    calendarGrid[row] = [];
    for (let col = 0; col < 7; col++) {
      if (row === 0 && col < startDay) {
        calendarGrid[row][col] = null;
      } else if (dayCounter <= daysCount) {
        calendarGrid[row][col] = new Date(y, m, dayCounter);
        dayCounter++;
      } else {
        calendarGrid[row][col] = null;
      }
    }
  }
  return calendarGrid;
}
