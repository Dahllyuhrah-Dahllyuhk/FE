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

  // Provider가 없는 경우 fallback 값 반환 (페이지 새로고침 없이)
  if (!ctx) {
    return {
      trigger: 0,
      refresh: () => {
        // fallback: 아무것도 하지 않음 (페이지 새로고침 방지)
        if (process.env.NODE_ENV === 'development') {
          console.warn('useEventRefresh: EventRefreshProvider가 없습니다.');
        }
      },
    };
  }

  return ctx;
}
