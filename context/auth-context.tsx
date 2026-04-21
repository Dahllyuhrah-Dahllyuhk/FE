'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { API_BASE, setAccessToken, getAccessToken, exchangeAuthCode } from '@/lib/api';
import { useSseSync } from '@/hooks/useSseSync';

type User = {
  id: string;
  nickname: string;
  profileImageUrl?: string | null;
  createdAt?:string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => void;
  withdraw: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const pathname = usePathname();
  const router = useRouter();

  const fetchMe = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      const token = getAccessToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/auth/me`, {
        credentials: 'include',
        headers,
      });

      // rotate된 새 access token이 응답 헤더에 있으면 메모리에 저장
      const newToken = res.headers.get('X-New-Access-Token');
      if (newToken) {
        setAccessToken(newToken);
      }

      if (!res.ok) {
        setUser(null);
        return;
      }

      const data = await res.json();
      setUser({
        id: data.id,
        nickname: data.nickname,
        profileImageUrl: data.profileImageUrl,
        createdAt: data.createdAt
      });
    } catch (e) {
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    await fetchMe();
    setIsLoading(false);
  }, [fetchMe]);

  useEffect(() => {
    (async () => {
      // 로그인 후 BE가 ?code= 파라미터로 리다이렉트하면 access token 교환
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        if (code) {
          try {
            const token = await exchangeAuthCode(code);
            setAccessToken(token);
          } catch (e) {
            console.error('Auth code exchange failed', e);
          }
          // URL에서 code 파라미터 제거
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, '', cleanUrl);
        }
      }
      await fetchMe();
      setIsLoading(false);
    })();
  }, [fetchMe]);

  // 로그인 완료 후 sessionStorage에 저장된 redirect 경로로 이동
  useEffect(() => {
    if (isLoading || !user) return;
    if (typeof window === 'undefined') return;

    const redirectTo = sessionStorage.getItem('login_redirect');
    if (redirectTo) {
      sessionStorage.removeItem('login_redirect');
      // 현재 이미 해당 경로에 있지 않을 때만 이동
      if (pathname !== redirectTo && pathname === '/') {
        router.replace(redirectTo);
      }
    }
  }, [isLoading, user]); // eslint-disable-line

  // ✅ 수정된 로그아웃 함수
  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      console.error('Logout API call failed', e);
    } finally {
      setAccessToken(null);
      setUser(null);
      window.location.href = '/login';
    }
  }, []);

  // 로그인 필요 페이지 보호는 ProtectedRoute 컴포넌트에서 처리

  // 로그인 상태일 때만 SSE 연결
  useSseSync(!isLoading && !!user);

  const withdraw = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('탈퇴 요청 실패');
    } catch (e) {
      console.error('Withdraw failed', e);
      throw e;
    } finally {
      setAccessToken(null);
      setUser(null);
      window.location.href = '/login';
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        refreshUser,
        logout,
        withdraw,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
