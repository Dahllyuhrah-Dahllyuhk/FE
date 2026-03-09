'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { BottomNav } from '@/components/bottom-nav';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Copy } from 'lucide-react';
import {
  addFriendByCode,
  fetchFriends,
  fetchMyInviteCode,
  deleteFriend,
  type FriendDto,
} from '@/lib/api';
import { toast } from '@/hooks/use-toast';

export default function FriendsPage() {
  const [friends, setFriends] = useState<FriendDto[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);

  const [myInviteCode, setMyInviteCode] = useState<string | null>(null);
  const [inviteCodeLoading, setInviteCodeLoading] = useState(true);

  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [addingFriend, setAddingFriend] = useState(false);
  const [deletingFriendId, setDeletingFriendId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');

  const inviteSectionRef = useRef<HTMLDivElement | null>(null);
  const inviteInputRef = useRef<HTMLInputElement | null>(null);

  // 검색 결과
  const filteredFriends = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return friends;
    return friends.filter((f) =>
      (f.nickname ?? '').toLowerCase().includes(term),
    );
  }, [friends, search]);

  // 초기 데이터 로딩: 내 친구 목록 + 내 초대코드
  useEffect(() => {
    const load = async () => {
      try {
        setFriendsLoading(true);
        setInviteCodeLoading(true);

        const [friendsRes, inviteRes] = await Promise.allSettled([
          fetchFriends(),
          fetchMyInviteCode(),
        ]);

        if (friendsRes.status === 'fulfilled') {
          setFriends(friendsRes.value);
        } else {
          console.error('친구 목록 불러오기 실패', friendsRes.reason);
        }

        if (inviteRes.status === 'fulfilled') {
          setMyInviteCode(inviteRes.value.code);
        } else {
          console.error('초대코드 불러오기 실패', inviteRes.reason);
        }
      } finally {
        setFriendsLoading(false);
        setInviteCodeLoading(false);
      }
    };

    load();
  }, []);

  const handleCopyInviteCode = async () => {
    if (!myInviteCode) return;
    try {
      await navigator.clipboard.writeText(myInviteCode);
      toast({
        title: '초대코드 복사 완료',
        description: myInviteCode,
      });
    } catch {
      toast({
        title: '복사 실패',
        description: '클립보드에 복사하지 못했어요.',
      });
    }
  };

  const handleAddFriend = async () => {
    const code = friendCodeInput.trim();
    if (!code) {
      const msg = '초대코드를 입력해 주세요.';
      setError(msg);
      toast({
        title: '초대코드를 입력해 주세요',
        description: msg,
      });
      return;
    }

    try {
      setAddingFriend(true);

      const newFriend = await addFriendByCode(code);

      setFriends((prev) => {
        if (prev.some((f) => f.id === newFriend.id)) return prev;
        return [newFriend, ...prev];
      });

      setFriendCodeInput('');
      setError(null);

      toast({
        title: '친구 추가 완료',
        description: `${newFriend.nickname}님이 친구가 되었어요.`,
      });
    } catch (e: any) {
      const msg =
        e instanceof Error
          ? e.message
          : '친구 추가에 실패했어요. 잠시 후 다시 시도해 주세요.';

      setError(msg);
      toast({
        title: '친구 추가 실패',
        description: msg,
      });
    } finally {
      setAddingFriend(false);
    }
  };

    const handleDeleteFriend = async (friend: FriendDto) => {
    const nickname = friend.nickname ?? '친구';

    // 간단 확인창
    if (!window.confirm(`${nickname}을(를) 친구 목록에서 삭제할까요?`)) {
      return;
    }

    try {
      setDeletingFriendId(friend.id);
      await deleteFriend(friend.id);

      // 프론트 목록에서도 제거
      setFriends((prev) => prev.filter((f) => f.id !== friend.id));

      toast({
        title: '친구 삭제 완료',
        description: `${nickname}가 친구 목록에서 삭제되었어요.`,
      });
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error
          ? err.message
          : '친구 삭제 중 오류가 발생했습니다.';

      toast({
        title: '친구 삭제 실패',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setDeletingFriendId(null);
    }
  };


  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-background pb-16">
        <header className="page-header">
          <div className="page-header-inner">
            <h1 className="page-title">친구</h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4">
          <div className="content-area space-y-4">

          {/* 내 초대코드 + 친구 추가 */}
          <div className="notion-card p-4 space-y-4">
            <div>
              <p className="section-title">내 초대코드</p>
              <div className="flex items-center justify-between gap-3">
                {inviteCodeLoading ? (
                  <span className="text-sm text-muted-foreground">불러오는 중...</span>
                ) : myInviteCode ? (
                  <span className="font-mono text-xl font-semibold tracking-widest text-foreground">
                    {myInviteCode}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">불러올 수 없어요</span>
                )}
                <button
                  type="button"
                  disabled={!myInviteCode}
                  onClick={handleCopyInviteCode}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors px-2 py-1 rounded-md hover:bg-accent"
                >
                  <Copy className="h-3.5 w-3.5" />
                  복사
                </button>
              </div>
            </div>

            <div className="border-t border-border/40 pt-4">
              <p className="section-title">초대코드로 추가</p>
              <div className="flex gap-2">
                <input
                  ref={inviteInputRef}
                  placeholder="초대코드 입력"
                  value={friendCodeInput}
                  onChange={(e) => { setFriendCodeInput(e.target.value); if (error) setError(null); }}
                  className={`flex-1 px-3 py-2 text-sm bg-accent/40 rounded-lg border outline-none focus:ring-1 focus:ring-ring transition-all ${
                    error ? 'border-destructive focus:ring-destructive' : 'border-transparent'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleAddFriend}
                  disabled={addingFriend}
                  className="px-3 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {addingFriend ? '추가 중...' : '추가'}
                </button>
              </div>
              {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
            </div>
          </div>

          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="친구 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm bg-accent/40 rounded-lg border-0 outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
            />
          </div>

          {/* 친구 목록 */}
          <div>
            <p className="section-title">친구 {filteredFriends.length > 0 ? `${filteredFriends.length}명` : ''}</p>
            {friendsLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />
              </div>
            ) : filteredFriends.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                {search ? '검색 결과가 없습니다' : '아직 친구가 없어요'}
              </p>
            ) : (
              <div className="space-y-1">
                {filteredFriends.map((friend) => {
                  const nickname = friend.nickname ?? '친구';
                  return (
                    <div key={friend.id} className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={friend.profileImageUrl ?? undefined} />
                          <AvatarFallback className="text-xs bg-accent text-accent-foreground font-medium">
                            {nickname[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-foreground">{nickname}</span>
                      </div>
                      <button
                        type="button"
                        disabled={deletingFriendId === friend.id}
                        onClick={() => handleDeleteFriend(friend)}
                        className="text-xs text-muted-foreground hover:text-destructive disabled:opacity-40 transition-colors px-2 py-1 rounded-md hover:bg-destructive/10"
                      >
                        {deletingFriendId === friend.id ? '...' : '삭제'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          </div>
        </main>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
