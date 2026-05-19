'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProtectedRoute } from '@/components/protected-route';
import { joinMeetingByCode } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';

function JoinPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  const [code, setCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // 인증 완료 후에만 자동 참여 시도 (비로그인 상태에서 API 호출 시 401 toast 방지)
  useEffect(() => {
    if (isLoading || !user) return;
    const urlCode = searchParams.get('code');
    if (urlCode) {
      const upper = urlCode.toUpperCase();
      setCode(upper);
      handleJoinWithCode(upper);
    }
  }, [user, isLoading]); // eslint-disable-line

  const handleJoinWithCode = async (targetCode: string) => {
    const trimmed = targetCode.trim().toUpperCase();
    if (!trimmed || trimmed.length < 6) return;

    setIsJoining(true);
    try {
      const meeting = await joinMeetingByCode(trimmed);
      toast({ title: '모임 참여 완료!', description: `"${meeting.name}"에 참여했습니다.` });
      router.push(`/meetings/${meeting.id}`);
    } catch (e: any) {
      const msg: string = e?.message ?? '참여에 실패했습니다.';
      // 이미 참여한 모임인 경우 해당 모임 페이지로 이동
      const alreadyMatch = msg.match(/meetingId=([a-zA-Z0-9]+)/);
      if (alreadyMatch) {
        toast({ title: '이미 참여 중인 모임입니다.', description: '모임 페이지로 이동합니다.' });
        router.push(`/meetings/${alreadyMatch[1]}`);
        return;
      }
      toast({ title: msg, variant: 'destructive' });
      setIsJoining(false);
    }
  };

  const handleJoin = () => handleJoinWithCode(code);

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm space-y-6">
          {/* 아이콘 */}
          <div className="flex flex-col items-center gap-2">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Users className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground">모임 참여</h1>
            <p className="text-sm text-muted-foreground text-center">
              초대 코드를 입력해 모임에 참여하세요
            </p>
          </div>

          {/* 코드 입력 */}
          <div className="space-y-3">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="초대 코드 (예: AB3DEFGH)"
              className="text-center text-lg font-mono tracking-widest h-12 rounded-xl"
              maxLength={8}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              autoFocus
            />
            <Button
              onClick={handleJoin}
              disabled={isJoining || code.trim().length < 6}
              className="w-full h-11 rounded-xl gap-2"
            >
              <LogIn className="h-4 w-4" />
              {isJoining ? '참여 중...' : '모임 참여'}
            </Button>
            <button
              onClick={() => router.back()}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              돌아가기
            </button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function JoinMeetingPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-r-transparent animate-spin" />
      </div>
    }>
      <JoinPageContent />
    </Suspense>
  );
}
