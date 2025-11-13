'use client';

import { ProtectedRoute } from '@/components/protected-route';
import { BottomNav } from '@/components/bottom-nav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { UserPlus, MessageCircle, MoreVertical } from 'lucide-react';

// Mock friend data
const mockFriends = [
  {
    id: 1,
    name: '이영희',
    status: '온라인',
    avatar: '이',
    recentMeeting: '어제 모임',
  },
  {
    id: 2,
    name: '박준호',
    status: '오프라인',
    avatar: '박',
    recentMeeting: '3일 전',
  },
  {
    id: 3,
    name: '최수진',
    status: '온라인',
    avatar: '최',
    recentMeeting: '5시간 전',
  },
  {
    id: 4,
    name: '정민준',
    status: '온라인',
    avatar: '정',
    recentMeeting: '2주 전',
  },
];

export default function FriendsPage() {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-background pb-16">
        <header className="border-b border-border bg-card px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground">친구</h1>
        </header>

        <main className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {/* Search and add friend */}
            <div className="flex gap-2">
              <Input placeholder="친구 검색..." className="flex-1" />
              <Button size="icon" variant="outline">
                <UserPlus className="h-5 w-5" />
              </Button>
            </div>

            {/* Friends list */}
            <div className="space-y-2">
              {mockFriends.map((friend) => (
                <Card key={friend.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-1 items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage
                            src={`/generic-placeholder-icon.png?height=48&width=48`}
                          />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {friend.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card ${
                            friend.status === '온라인'
                              ? 'bg-green-500'
                              : 'bg-gray-400'
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">
                          {friend.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {friend.recentMeeting}
                        </p>
                      </div>
                      <Badge
                        variant={
                          friend.status === '온라인' ? 'default' : 'secondary'
                        }
                      >
                        {friend.status}
                      </Badge>
                    </div>
                    <div className="ml-2 flex gap-2">
                      <Button size="icon" variant="ghost">
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </main>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
