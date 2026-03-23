'use client';

import { useEffect, useRef } from 'react';
import { useEventRefresh } from '@/hooks/useEventRefresh';
import { API_BASE } from '@/lib/api';

/**
 * 백엔드 SSE(/api/sse/events)에 연결해 구글 캘린더 변경을 실시간으로 수신.
 * - events-updated: 전체 캘린더 새로고침 트리거
 * - events-changed: 부분 변경 (현재는 전체 새로고침으로 처리)
 * - 연결 끊김 시 지수 백오프로 자동 재연결
 */
export function useSseSync(enabled: boolean) {
  const { refresh } = useEventRefresh();
  const esRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRY_DELAY_MS = 30_000;

  useEffect(() => {
    if (!enabled) return;

    function connect() {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }

      const es = new EventSource(`${API_BASE}/api/sse/events`, {
        withCredentials: true,
      });
      esRef.current = es;

      es.addEventListener('connected', () => {
        retryCountRef.current = 0;
      });

      es.addEventListener('events-updated', () => {
        refresh();
      });

      es.addEventListener('events-changed', () => {
        // 부분 패치 대신 전체 새로고침으로 처리 (단순화)
        refresh();
      });

      es.addEventListener('google-reauth-required', () => {
        // 필요 시 토스트 등 추가 가능
        console.warn('[SSE] Google reauth required');
      });

      es.onerror = () => {
        es.close();
        esRef.current = null;

        // 지수 백오프 재연결 (1s → 2s → 4s → ... → 30s)
        const delay = Math.min(
          1000 * Math.pow(2, retryCountRef.current),
          MAX_RETRY_DELAY_MS
        );
        retryCountRef.current += 1;

        retryTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };
    }

    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [enabled, refresh]);
}
