'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Calendar, MessageSquare, Users, User } from 'lucide-react';
import { useAuth } from '@/context/auth-context'; // add useAuth hook

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  const navItems = [
    { href: '/', icon: Home, label: '홈' },
    { href: '/meetings', icon: Calendar, label: '모임' },
    { href: '/ai', icon: MessageSquare, label: 'AI' },
    { href: '/friends', icon: Users, label: '친구' },
    { href: '/profile', icon: User, label: '내정보' },
  ];

  const handleLogout = async () => {
    try {
      const API_BASE =
        process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';
      await fetch(`${API_BASE}/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      logout();
      router.push('/login');
    } catch (error) {
      console.error('[v0] Logout failed:', error);
      logout();
      router.push('/login');
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-3 transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
        {/* Removed Settings and LogOut; Added Friends tab */}
        {/* <button
          onClick={handleLogout}
          className="flex flex-1 flex-col items-center gap-1 py-3 transition-colors text-muted-foreground hover:text-foreground"
          title="로그아웃"
        >
          <Users className="h-5 w-5" />
          <span className="text-xs font-medium">로그아웃</span>
        </button> */}
      </div>
    </nav>
  );
}
