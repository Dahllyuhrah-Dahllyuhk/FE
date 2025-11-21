'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, MessageSquare, Users, User } from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', icon: Home, label: '홈' },
    { href: '/meetings', icon: Calendar, label: '모임' },
    { href: '/ai', icon: MessageSquare, label: 'AI' },
    { href: '/friends', icon: Users, label: '친구' },
    { href: '/profile', icon: User, label: '내정보' },
  ];

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
      </div>
    </nav>
  );
}
