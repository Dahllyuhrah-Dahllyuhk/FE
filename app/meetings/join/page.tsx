'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProtectedRoute } from '@/components/protected-route';
import { joinMeetingByCode } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

function JoinPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // URL에 code 파라미터가 있으면 자동 입력
  useEffect(() => {
    const urlCode = searchParams.get('code');
    if (urlCode) setCode(urlCode.toUpperCase());
  }, [searchParams]);

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed || trimmed.length < 6) {
      toast({ title: '유효한 초대 코드를 입력해주세요.', variant: 'destructive' });
      return;
    }

    setIsJoining(true);
    try {
      const meeting = await joinMeetingByCode(trimmed);
      toast({ title: '모임 참여 완료!', description: `"${meeting.name}"에 참여했습니다.` });
      router.push(`/meetings/${meeting.id}`);
    } catch (e: any) {
      const msg = e?.message ?? '참여에 실패했습니다.';
      toast({ title: msg, variant: 'destructive' });
    } finally {
      setIsJoining(false);
    }
  };

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
