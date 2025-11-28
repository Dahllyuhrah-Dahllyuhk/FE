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
import { API_BASE } from '@/lib/api';

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
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const pathname = usePathname();
  const router = useRouter();

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        credentials: 'include',
      });

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
      console.error('auth /api/auth/me error', e);
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
      await fetchMe();
      setIsLoading(false);
    })();
  }, [fetchMe]);

  // ✅ 수정된 로그아웃 함수
  const logout = useCallback(async () => {
    try {
      // 백엔드에 쿠키 삭제 요청 (POST /api/auth/logout)
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      console.error('Logout API call failed', e);
    } finally {
      // 프론트엔드 상태 비우기
      setUser(null);
      // 로그인 페이지로 이동 (새로고침 효과를 위해 window.location 사용)
      window.location.href = '/login';
    }
  }, []);

  // 로그인 필요 페이지 보호 ("/login"은 예외)
  useEffect(() => {
    if (isLoading) return;

    if (!user && pathname !== '/login') {
      router.replace('/login');
    }
  }, [isLoading, user, pathname, router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        refreshUser,
        logout,
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
