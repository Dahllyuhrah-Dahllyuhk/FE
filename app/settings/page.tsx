'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useAuth } from '@/context/auth-context';
import { ProtectedRoute } from '@/components/protected-route';
import { BottomNav } from '@/components/bottom-nav';
import { Switch } from '@/components/ui/switch';
import {
  ChevronRight, Bell, Moon, Globe, Lock, HelpCircle, LogOut, UserX, ExternalLink,
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
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { logout, withdraw } = useAuth();
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const handleWithdraw = async () => {
    if (withdrawing) return;
    setWithdrawing(true);
    try {
      await withdraw();
    } catch {
      setWithdrawing(false);
      setShowWithdrawConfirm(false);
    }
  };

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
                label="개인정보처리방침"
                onClick={() => router.push('/privacy')}
              />
              <SettingRow
                icon={ExternalLink}
                label="이용약관"
                onClick={() => router.push('/terms')}
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

          {/* 회원 탈퇴 */}
          {!showWithdrawConfirm ? (
            <button
              onClick={() => setShowWithdrawConfirm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-muted-foreground rounded-xl hover:text-destructive transition-colors"
            >
              <UserX className="h-4 w-4" />
              회원 탈퇴
            </button>
          ) : (
            <div className="rounded-xl border border-destructive/30 p-4 space-y-3">
              <p className="text-sm font-semibold text-destructive text-center">정말 탈퇴하시겠어요?</p>
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                탈퇴 시 모든 데이터(모임, 일정, 친구 관계)가 즉시 삭제되며 복구할 수 없습니다.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowWithdrawConfirm(false)}
                  className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-border hover:bg-accent transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={withdrawing}
                  className="flex-1 py-2.5 text-sm font-medium rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-60"
                >
                  {withdrawing ? '처리 중...' : '탈퇴하기'}
                </button>
              </div>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground/50 pb-2">맞춰봄 v1.0</p>
        </main>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
