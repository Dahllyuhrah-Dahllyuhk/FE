'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { BottomNav } from '@/components/bottom-nav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, UserPlus, MessageCircle, MoreVertical, Copy } from 'lucide-react';
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
        <header className="border-b border-border bg-card px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground">친구</h1>
        </header>

        <main className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {/* ✅ 내 초대코드 (새 기능) */}
            <Card className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    내 초대코드
                  </p>
                  {inviteCodeLoading ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      불러오는 중...
                    </p>
                  ) : myInviteCode ? (
                    <p className="mt-1 font-mono text-lg tracking-widest">
                      {myInviteCode}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">
                      초대코드를 불러오지 못했어요.
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={!myInviteCode}
                  onClick={handleCopyInviteCode}
                >
                  <Copy className="h-5 w-5" />
                </Button>
              </div>
            </Card>

            {/* ✅ 초대코드로 친구 추가 (새 기능, 에러시 빨간색) */}
            <Card className="p-4">
              <div className="flex flex-col gap-3">
                <p className="text-sm font-semibold text-foreground">
                  초대코드로 친구 추가
                </p>
                <div className="flex gap-2">
                  <Input
                    ref={inviteInputRef}    
                    placeholder="친구의 초대코드를 입력하세요"
                    value={friendCodeInput}
                    onChange={(e) => {
                      setFriendCodeInput(e.target.value);
                      if (error) setError(null);
                    }}
                    className={`flex-1 ${
                      error
                        ? 'border-destructive focus-visible:ring-destructive'
                        : ''
                    }`}
                  />
                  <Button
                    type="button"
                    onClick={handleAddFriend}
                    disabled={addingFriend}
                  >
                    <UserPlus className="mr-1 h-4 w-4" />
                    {addingFriend ? '추가 중...' : '추가'}
                  </Button>
                </div>
                {error ? (
                  <p className="text-xs text-destructive">{error}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                  
                  </p>
                )}
              </div>
            </Card>

            {/* 🔹 기존 스타일 유지: 검색 + 친구 리스트 레이아웃 */}
            {/* Search and add friend */}
            <div className="flex gap-2">
              <Input
                placeholder="친구 검색..."
                className="flex-1"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
                <Button
                    size="icon"
                    variant="outline"
                    type="button"
                    onClick={() => {
                          // 🔹 초대코드 영역으로 스크롤 + 인풋 포커스
                          inviteSectionRef.current?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'start',
                        });
                        // scroll 후 약간 딜레이 두고 포커스 주면 더 자연스러움
                        setTimeout(() => inviteInputRef.current?.focus(), 300);
                      }}>
                <Search className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-2">
              {friendsLoading ? (
                <p className="text-sm text-muted-foreground">친구 목록 불러오는 중...</p>
              ) : filteredFriends.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  아직 친구가 없거나 검색 결과가 없습니다.
                </p>
              ) : (
                filteredFriends.map((friend) => {
                  const nickname = friend.nickname ?? '친구';
                  const avatarInitial = nickname[0] ?? '?';
                
                  return (
                    <Card key={friend.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-1 items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage
                              src={
                                friend.profileImageUrl ??
                                '/generic-placeholder-icon.png?height=48&width=48'
                              }
                            />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {avatarInitial}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1">
                            <p className="font-semibold text-foreground">{nickname}</p>
                          </div>
                        </div>

                      <div className="ml-2 flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            type="button"
                            disabled={deletingFriendId === friend.id}
                            onClick={() => handleDeleteFriend(friend)}
                          >
                            {deletingFriendId === friend.id ? '삭제 중...' : '삭제'}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </main>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
