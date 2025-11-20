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

  const logout = useCallback(() => {
    // 백엔드에서 쿠키 삭제 후 FRONTEND_ORIGIN으로 리다이렉트하도록 구현해둔 경우
    window.location.href = `${API_BASE}/logout`;
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
