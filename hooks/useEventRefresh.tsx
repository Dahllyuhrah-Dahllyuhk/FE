'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';

type EventRefreshContextValue = {
  /** 이 값이 바뀌면 캘린더 페이지가 다시 fetchAllCalendarEvents() 를 호출하도록 사용 */
  trigger: number;
  /** 어디서든 호출하면 trigger++ 되어 전체 캘린더를 다시 불러오게 됨 */
  refresh: () => void;
};

const EventRefreshContext = createContext<EventRefreshContextValue | null>(
  null
);

// Provider가 없을 때 반환하는 안정적인 fallback.
// 매 렌더마다 새 객체/함수를 만들면 이를 의존성으로 쓰는 effect(useSseSync 등)가
// 무한 재실행되므로, 정체성이 고정된 모듈 레벨 상수로 둔다.
const NOOP_REFRESH = () => {
  if (process.env.NODE_ENV === 'development') {
    console.warn('useEventRefresh: EventRefreshProvider가 없습니다.');
  }
};
const FALLBACK_VALUE: EventRefreshContextValue = {
  trigger: 0,
  refresh: NOOP_REFRESH,
};

type ProviderProps = {
  children: ReactNode;
};

export function EventRefreshProvider({ children }: ProviderProps) {
  const [trigger, setTrigger] = useState(0);

  const refresh = useCallback(() => {
    setTrigger((t) => t + 1);
  }, []);

  return (
    <EventRefreshContext.Provider value={{ trigger, refresh }}>
      {children}
    </EventRefreshContext.Provider>
  );
}

export function useEventRefresh(): EventRefreshContextValue {
  const ctx = useContext(EventRefreshContext);

  // Provider가 없는 경우 안정적인 fallback 값 반환 (정체성 고정 — effect 무한 재실행 방지)
  return ctx ?? FALLBACK_VALUE;
}
