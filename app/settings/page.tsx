'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/context/auth-context';
import { ProtectedRoute } from '@/components/protected-route';
import { BottomNav } from '@/components/bottom-nav';
import { Switch } from '@/components/ui/switch';
import {
  ChevronRight, Bell, Moon, Globe, Lock, HelpCircle, LogOut,
} from 'lucide-react';

function SettingRow({
  icon: Icon,
  label,
  description,
  right,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  description?: string;
  right?: React.ReactNode;
  onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      className={`list-row w-full gap-3 ${onClick ? 'hover:opacity-70 active:opacity-50 transition-opacity' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent flex-shrink-0">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground leading-tight">{label}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{description}</p>
          )}
        </div>
      </div>
      {right ?? (onClick && <ChevronRight className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />)}
    </Tag>
  );
}

import type React from 'react';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-background pb-16">
        <header className="page-header">
          <div className="page-header-inner">
            <h1 className="page-title">설정</h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-6">

          {/* 알림 */}
          <section>
            <p className="section-title">알림</p>
            <div className="notion-card px-4">
              <SettingRow
                icon={Bell}
                label="푸시 알림"
                description="일정 및 모임 알림을 받습니다"
                right={
                  <Switch
                    checked={pushNotifications}
                    onCheckedChange={setPushNotifications}
                  />
                }
              />
              <SettingRow
                icon={Bell}
                label="이메일 알림"
                description="이메일로 알림을 받습니다"
                right={
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                }
              />
            </div>
          </section>

          {/* 표시 */}
          <section>
            <p className="section-title">표시</p>
            <div className="notion-card px-4">
              <SettingRow
                icon={Moon}
                label="다크 모드"
                description="어두운 테마를 사용합니다"
                right={
                  <Switch
                    checked={theme === 'dark'}
                    onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                  />
                }
              />
              <SettingRow
                icon={Globe}
                label="언어"
                description="한국어"
                onClick={() => {}}
              />
            </div>
          </section>

          {/* 계정 */}
          <section>
            <p className="section-title">계정</p>
            <div className="notion-card px-4">
              <SettingRow
                icon={Lock}
                label="개인정보 보호"
                description="보안 및 개인정보 설정"
                onClick={() => {}}
              />
              <SettingRow
                icon={HelpCircle}
                label="도움말"
                description="자주 묻는 질문 및 지원"
                onClick={() => {}}
              />
            </div>
          </section>

          {/* 로그아웃 */}
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-destructive rounded-xl border border-destructive/20 hover:bg-destructive/5 active:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </button>

          <p className="text-center text-xs text-muted-foreground/50 pb-2">맞춰봄 v1.0</p>
        </main>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
