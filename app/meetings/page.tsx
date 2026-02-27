'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { BottomNav } from '@/components/bottom-nav';
import { Plus, Calendar, Search, Users, Loader2 } from 'lucide-react';
import { fetchMeetings } from '@/lib/api';
import type { Meeting, MeetingStatus } from '@/types/meeting';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useAuth } from '@/context/auth-context';

export default function MeetingsPage() {
  const router = useRouter();
  const { user } = useAuth();
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
      (activeTab === 'pending' && meeting.status === 'PENDING') ||
      (activeTab === 'confirmed' && meeting.status === 'CONFIRMED') ||
      (activeTab === 'closed' && meeting.status === 'CLOSED');

    return matchesSearch && matchesTab;
  });

  const getStatusColor = (status: MeetingStatus) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-400';
      case 'CONFIRMED': return 'bg-green-500';
      case 'CLOSED': return 'bg-muted-foreground/40';
      default: return 'bg-muted-foreground/40';
    }
  };

  const getStatusTextColor = (status: MeetingStatus) => {
    switch (status) {
      case 'PENDING': return 'text-amber-600 dark:text-amber-400';
      case 'CONFIRMED': return 'text-green-600 dark:text-green-400';
      case 'CLOSED': return 'text-muted-foreground';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusText = (status: MeetingStatus) => {
    switch (status) {
      case 'PENDING': return '조율 중';
      case 'CONFIRMED': return '확정됨';
      case 'CLOSED': return '종료됨';
      default: return status;
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-background pb-16">
        <header className="page-header">
          <div className="page-header-inner">
            <h1 className="page-title">모임</h1>
            <button
              onClick={() => router.push('/meetings/create')}
              className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-accent transition-colors"
            >
              <Plus className="h-4 w-4 text-foreground/70" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 space-y-3">
          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="모임 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm bg-accent/40 rounded-lg border-0 outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
            />
          </div>

          {/* 탭 */}
          <div className="flex gap-1 p-1 bg-accent/40 rounded-lg">
            {[
              { value: 'all', label: '전체' },
              { value: 'pending', label: '조율 중' },
              { value: 'confirmed', label: '확정' },
              { value: 'closed', label: '종료' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeTab === tab.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 목록 */}
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <Calendar className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? '검색 결과가 없습니다' : '새로운 모임을 추가해보세요'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMeetings.map((meeting) => {
                const currentParticipant = meeting.participants?.find(
                  (p) => p.userId === user?.id
                );
                const isPending = currentParticipant?.status === 'PENDING';

                return (
                  <button
                    key={meeting.id}
                    className="notion-card notion-card-hover w-full text-left p-4 block"
                    onClick={() => router.push(`/meetings/${meeting.id}`)}
                  >
                    <div className="flex items-start gap-3">
                      {/* 상태 인디케이터 */}
                      <div className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${getStatusColor(meeting.status)}`} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="text-sm font-medium text-foreground truncate">
                            {meeting.name}
                          </span>
                          {isPending && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              초대됨
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {meeting.confirmedStart
                              ? format(new Date(meeting.confirmedStart), 'M월 d일 HH:mm', { locale: ko })
                              : `${format(new Date(meeting.requirement.dateRangeStart), 'M월 d일', { locale: ko })} ~ ${format(new Date(meeting.requirement.dateRangeEnd), 'M월 d일', { locale: ko })}`}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {meeting.participants?.length ?? meeting.invitedUserIds?.length ?? 0}명
                          </span>
                          <span className={`text-[10px] font-medium ${getStatusTextColor(meeting.status)}`}>
                            {getStatusText(meeting.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
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
