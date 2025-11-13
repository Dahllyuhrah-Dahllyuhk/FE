'use client';

import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { BottomNav } from '@/components/bottom-nav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { WeeklySchedule } from '@/components/weekly-schedule';
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit,
  Award,
  TrendingUp,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';

export default function ProfilePage() {
  const router = useRouter();
  const { logout } = useAuth();

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
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-background pb-16">
        <header className="border-b border-border bg-card px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground">내 정보</h1>
        </header>

        <main className="flex-1 overflow-y-auto p-4">
          <div className="space-y-6">
            <Card className="overflow-hidden p-0">
              <div className="h-24 bg-gradient-to-r from-blue-500 to-purple-500" />
              <div className="relative px-6 pb-6">
                <div className="flex flex-col items-center">
                  <Avatar className="-mt-12 h-24 w-24 border-4 border-card">
                    <AvatarImage src="/placeholder.svg?height=96&width=96" />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-2xl text-white">
                      김
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="mt-4 text-2xl font-bold text-foreground">
                    김철수
                  </h2>
                  <p className="text-muted-foreground">프로젝트 매니저</p>
                  <Badge variant="secondary" className="mt-2">
                    <Award className="mr-1 h-3 w-3" />
                    프리미엄 회원
                  </Badge>
                  <Button className="mt-4 bg-transparent" variant="outline">
                    <Edit className="mr-2 h-4 w-4" />
                    프로필 편집
                  </Button>
                </div>
              </div>
            </Card>

            <WeeklySchedule />

            <Card className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">
                  활동 통계
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">24</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    예정된 모임
                  </p>
                </div>
                <Separator orientation="vertical" className="mx-auto h-12" />
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">156</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    완료된 모임
                  </p>
                </div>
                <Separator orientation="vertical" className="mx-auto h-12" />
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">89%</div>
                  <p className="mt-1 text-xs text-muted-foreground">참석률</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="mb-4 text-lg font-semibold text-foreground">
                연락처 정보
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">이메일</p>
                    <p className="font-medium text-foreground">
                      kim.chulsoo@example.com
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">전화번호</p>
                    <p className="font-medium text-foreground">010-1234-5678</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">위치</p>
                    <p className="font-medium text-foreground">
                      서울, 대한민국
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">가입일</p>
                  <p className="font-medium text-foreground">2024년 1월 15일</p>
                </div>
              </div>
            </Card>

            <div className="space-y-3">
              <Button
                onClick={() => router.push('/settings')}
                variant="outline"
                className="w-full"
              >
                <Settings className="mr-2 h-4 w-4" />
                설정
              </Button>
              <Button
                onClick={handleLogout}
                variant="destructive"
                className="w-full"
              >
                <LogOut className="mr-2 h-4 w-4" />
                로그아웃
              </Button>
            </div>
          </div>
        </main>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
