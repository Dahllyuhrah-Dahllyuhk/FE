'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, Calendar, Users, User } from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { href: '/', icon: Home, label: '홈' },
    { href: '/meetings', icon: Calendar, label: '모임' },
    { href: '/friends', icon: Users, label: '친구' },
    { href: '/profile', icon: User, label: '내정보' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border/40"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}
    >
      <div className="flex items-center justify-around pt-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            // <Link>(React transition 기반) 네비게이션이 iOS Chrome(WebKit)에서 간헐적으로
            // 막히는 문제가 있어, 명령형 router.push로 이동한다. (router.push는 정상 동작 확인됨)
            <button
              key={item.href}
              type="button"
              // iOS Chrome 동적 툴바로 인해 fixed 하단 탭에서 click이 버튼에 도달하지 못하고
              // HTML로 retarget되는 문제가 있어(진단으로 확인), pointerdown으로 네비게이션한다.
              // pointerdown은 버튼에 정상 도달함이 확인됨.
              onPointerDown={() => { if (pathname !== item.href) router.push(item.href); }}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
