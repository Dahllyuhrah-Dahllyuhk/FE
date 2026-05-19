'use client';

import { useEffect, useRef } from 'react';
import { useEventRefresh } from '@/hooks/useEventRefresh';
import { API_BASE, getAccessToken } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

/**
 * 백엔드 SSE(/api/sse/events)에 연결해 구글 캘린더 변경 및 모임 알림을 실시간으로 수신.
 * - events-updated: 전체 캘린더 새로고침 트리거
 * - events-changed: 부분 변경 (현재는 전체 새로고침으로 처리)
 * - meeting-invited: 모임 초대 / 참여 알림
 * - meeting-confirmed: 모임 확정 알림
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

      // EventSource는 커스텀 헤더 불가 → access token을 쿼리 파라미터로 전달
      const accessToken = getAccessToken();
      const sseUrl = accessToken
        ? `${API_BASE}/api/sse/events?token=${encodeURIComponent(accessToken)}`
        : `${API_BASE}/api/sse/events`;

      const es = new EventSource(sseUrl, {
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
        refresh();
      });

      es.addEventListener('meeting-invited', (e) => {
        try {
          const data = JSON.parse(e.data);
          toast({
            title: '새 모임 초대',
            description: `"${data.meetingName}" 모임에 초대됐습니다.`,
          });
        } catch {
          toast({ title: '새 모임 알림이 도착했습니다.' });
        }
      });

      es.addEventListener('meeting-confirmed', (e) => {
        try {
          const data = JSON.parse(e.data);
          toast({
            title: '모임이 확정됐습니다',
            description: `"${data.meetingName}" 일정이 캘린더에 추가됐습니다.`,
          });
          refresh();
        } catch {
          toast({ title: '모임 확정 알림이 도착했습니다.' });
          refresh();
        }
      });

      es.addEventListener('google-reauth-required', () => {
        toast({
          title: '구글 재연동 필요',
          description: '설정에서 구글 캘린더를 다시 연동해주세요.',
          variant: 'destructive',
        });
      });

      es.onerror = () => {
        es.close();
        esRef.current = null;

        // enabled가 false로 바뀐 경우(로그아웃 등)엔 재연결하지 않음
        if (!enabled) return;

        const delay = Math.min(
          1000 * Math.pow(2, retryCountRef.current),
          MAX_RETRY_DELAY_MS
        );
        retryCountRef.current += 1;

        retryTimeoutRef.current = setTimeout(() => {
          if (enabled) connect();
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
