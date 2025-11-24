'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { BottomNav } from '@/components/bottom-nav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, Search, Users, Loader2 } from 'lucide-react';
import { fetchMeetings } from '@/lib/api';
import type { Meeting } from '@/types/meeting';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useAuth } from '@/context/auth-context'; // Added useAuth import

export default function MeetingsPage() {
  const router = useRouter();
  const { user } = useAuth(); // Get current user
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const loadMeetings = async () => {
      try {
        const data = await fetchMeetings();
        setMeetings(data);
      } catch (error) {
        console.error('Failed to fetch meetings', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadMeetings();
  }, []);

  const filteredMeetings = meetings.filter((meeting) => {
    const matchesSearch = meeting.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'confirmed' && meeting.status === 'CONFIRMED') ||
      (activeTab === 'pending' && meeting.status === 'PENDING');

    return matchesSearch && matchesTab;
  });

  const getStatusColor = (status: Meeting['status']) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-500';
      case 'CONFIRMED':
        return 'bg-green-500';
      case 'CANCELLED':
        return 'bg-red-500';
      default:
        return 'bg-muted';
    }
  };

  const getStatusText = (status: Meeting['status']) => {
    switch (status) {
      case 'PENDING':
        return '조율 중';
      case 'CONFIRMED':
        return '확정됨';
      case 'CANCELLED':
        return '취소됨';
      default:
        return status;
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-background pb-16">
        <header className="border-b border-border bg-card px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">모임 목록</h1>
            <Button size="icon" onClick={() => router.push('/meetings/create')}>
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="모임 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">
                전체
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex-1">
                조율 중
              </TabsTrigger>
              <TabsTrigger value="confirmed" className="flex-1">
                확정됨
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                모임이 없습니다
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? '검색 결과가 없습니다'
                  : '새로운 모임을 추가해보세요'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMeetings.map((meeting) => {
                const currentParticipant = meeting.participants?.find(
                  (p) => p.userId === user?.id
                );
                const isPending = currentParticipant?.status === 'PENDING';

                return (
                  <Card
                    key={meeting.id}
                    className="p-4 transition-shadow hover:shadow-md cursor-pointer"
                    onClick={() => router.push(`/meetings/${meeting.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-foreground">
                            {meeting.name}
                          </h3>
                          {isPending && (
                            <Badge
                              variant="secondary"
                              className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-0"
                            >
                              초대됨
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={`${getStatusColor(
                              meeting.status
                            )} border-0 text-white`}
                          >
                            {getStatusText(meeting.status)}
                          </Badge>
                        </div>
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {meeting.confirmedStart
                                ? format(
                                    new Date(meeting.confirmedStart),
                                    'M월 d일 (E) HH:mm',
                                    { locale: ko }
                                  )
                                : `${format(
                                    new Date(
                                      meeting.requirement.dateRangeStart
                                    ),
                                    'M월 d일 (E)',
                                    {
                                      locale: ko,
                                    }
                                  )} ~ ${format(
                                    new Date(meeting.requirement.dateRangeEnd),
                                    'M월 d일 (E)',
                                    {
                                      locale: ko,
                                    }
                                  )}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>
                              참석자{' '}
                              {meeting.participants?.length ??
                                meeting.invitedUserIds?.length ??
                                0}
                              명
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </main>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
