'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { BottomNav } from '@/components/bottom-nav';
import {
  Send, Bot, User, Sparkles, Mic, MicOff,
  Calendar as CalendarIcon, Clock, MapPin, Users, CheckCircle,
} from 'lucide-react';
import { API_BASE } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

// --- Types ---

type AIResponseData = {
  category: string;
  data: any;
};

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content?: string;      // 말풍선 텍스트 & TTS 대상
  aiData?: AIResponseData; // 카드 데이터 (TTS 안 읽음)
  timestamp: Date;
};

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

const BE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8080';

// --- Sub Components (카드 UI) ---

// 1. 일정(Schedule) 카드 (날짜 오류 방지 추가됨)
const ScheduleCard = ({ data }: { data: any }) => {
  const router = useRouter();
  const events = Array.isArray(data) ? data : [data];
  if (events.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 w-full mt-1.5">
      {events.map((evt: any, idx: number) => {
        const startVal = evt.start || evt.startTimestamp;
        const endVal = evt.end || evt.endTimestamp;
        const startDate = startVal ? new Date(startVal) : null;
        const endDate = endVal ? new Date(endVal) : null;
        if (!startDate || isNaN(startDate.getTime())) return null;
        const isAllDay = evt.allDay;

        return (
          <div
            key={evt.id || idx}
            onClick={() => router.push('/')}
            className="notion-card notion-card-hover cursor-pointer overflow-hidden"
            style={{ borderLeft: `3px solid ${evt.color || '#6366f1'}` }}
          >
            <div className="p-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-xs font-semibold text-foreground truncate">{evt.title || evt.summary || '제목 없음'}</p>
                {isAllDay && (
                  <span className="text-[10px] px-1.5 py-px rounded bg-accent text-muted-foreground flex-shrink-0">종일</span>
                )}
              </div>
              <div className="space-y-0.5 text-[11px] text-muted-foreground">
                {evt.description && <p className="truncate">{evt.description}</p>}
                <div className="flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3 flex-shrink-0" />
                  <span>
                    {format(startDate, 'M월 d일 (E)', { locale: ko })}
                    {!isAllDay && endDate && !isNaN(endDate.getTime()) &&
                      ` · ${format(startDate, 'HH:mm')} ~ ${format(endDate, 'HH:mm')}`}
                  </span>
                </div>
                {evt.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{evt.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// 2. 모임(Meeting) 카드 (날짜 오류 방지 추가됨)
const MeetingCard = ({ data }: { data: any }) => {
  const router = useRouter();
  const meetings = Array.isArray(data) ? data : [data];
  if (meetings.length === 0) return null;

  const statusConfig: Record<string, { label: string; color: string }> = {
    PENDING:   { label: '조율 중',  color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    CONFIRMED: { label: '확정됨',  color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    CLOSED:    { label: '종료됨',  color: 'bg-accent text-muted-foreground' },
  };

  return (
    <div className="flex flex-col gap-2 w-full mt-1.5">
      {meetings.map((meeting: any, idx: number) => {
        const req = meeting.requirement || {};
        const confirmedDate = meeting.confirmedStart ? new Date(meeting.confirmedStart) : null;
        const isValidConfirmed = confirmedDate && !isNaN(confirmedDate.getTime());
        const cfg = statusConfig[meeting.status] ?? { label: meeting.status, color: 'bg-accent text-muted-foreground' };

        return (
          <div
            key={meeting.id || idx}
            onClick={() => router.push(`/meetings/${meeting.id}`)}
            className="notion-card notion-card-hover cursor-pointer p-3"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-xs font-semibold text-foreground truncate">{meeting.name}</p>
              <span className={`text-[10px] font-medium px-1.5 py-px rounded flex-shrink-0 ${cfg.color}`}>
                {cfg.label}
              </span>
            </div>
            <div className="space-y-1 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CalendarIcon className="h-3 w-3 flex-shrink-0" />
                <span>{req.dateRangeStart ?? '미정'} ~ {req.dateRangeEnd ?? '미정'}</span>
              </div>
              {isValidConfirmed ? (
                <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium">
                  <CheckCircle className="h-3 w-3 flex-shrink-0" />
                  <span>확정: {format(confirmedDate!, 'M/d HH:mm')}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 flex-shrink-0" />
                  <span>시간 조율 필요</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Users className="h-3 w-3 flex-shrink-0" />
                <span>참여자 {meeting.participants?.length || 0}명</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// --- Main Component ---

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `안녕하세요! 👋
일정과 모임 관리를 도와드릴게요!

아래처럼 편하게 말씀해 주세요! 🗣️

📅 **일정 관리**
- "내일 오후 7시 회식 일정 잡아줘"
- "이번 주 일정 모두 보여줘"
- "3시에 있는 미팅 삭제해줘"

👥 **모임 관리**
- "이번 주말 등산 모임 만들어줘"
- "송년회 모임 상태 알려줘"`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 스크롤 자동 이동
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // --- Web Speech API: STT (음성 인식) ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
      const SpeechRecognitionConstructor = SpeechRecognition || webkitSpeechRecognition;

      if (SpeechRecognitionConstructor) {
        const recognition = new SpeechRecognitionConstructor();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'ko-KR';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput((prev) => prev + (prev ? ' ' : '') + transcript);
          setIsListening(false);
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
          toast({
            title: "음성 인식 오류",
            description: "다시 시도해주세요.",
            variant: "destructive"
          });
        };

        recognition.onend = () => setIsListening(false);
        recognitionRef.current = recognition;
      } else {
        // 미지원 브라우저 안내 (토스트 제거됨 - 선택사항)
      }
    }
  }, []);

  // --- Web Speech API: TTS (음성 합성) ---
  const speak = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const synth = window.speechSynthesis;
      
      if (synth.speaking) {
        synth.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      
      // 목소리 설정 (Google 한국어 우선)
      const setVoice = () => {
        const voices = synth.getVoices();
        const koVoice = voices.find(v => v.lang.includes('ko') && v.name.includes('Google')) 
                     || voices.find(v => v.lang.includes('ko'));
        
        if (koVoice) {
          utterance.voice = koVoice;
        }
        
        utterance.lang = 'ko-KR';
        utterance.rate = 1.0; 
        utterance.pitch = 1.0; 
        
        synth.speak(utterance);
      };

      if (synth.getVoices().length > 0) {
        setVoice();
      } else {
        synth.onvoiceschanged = setVoice;
      }
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast({ title: "지원 불가", description: "이 브라우저는 음성 인식을 지원하지 않습니다.", variant: "destructive" });
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // 내가 말할 땐 AI 목소리 끄기
      }
      recognitionRef.current.start();
      setIsListening(true);
      toast({ title: "듣고 있어요...", description: "말씀해 주세요." });
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      // 백엔드 호출
      const response = await fetch(`${BE}/api/chat/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prompt : userMessage.content }),
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const result = await response.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        timestamp: new Date(),
      };

      // 🔥 TTS는 오직 aiMessage.content만 읽습니다.
      if (result.category && result.data) {
        aiMessage.aiData = {
          category: result.category,
          data: result.data
        };
        // 백엔드에서 온 summary(요약 멘트)를 말풍선 내용으로 설정
        aiMessage.content = result.summary || '요청하신 작업을 완료했습니다.';
      } else {
        // 일반 대화인 경우
        aiMessage.content = typeof result.data === 'string' ? result.data : JSON.stringify(result);
      }

      setMessages((prev) => [...prev, aiMessage]);

      // 🔊 TTS 실행 (summary만 읽음)
      if (aiMessage.content) {
        speak(aiMessage.content);
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMsg = '처리 중 오류가 발생했어요 ..';
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorMsg,
        timestamp: new Date(),
      }]);
      speak(errorMsg);
    } finally {
      setIsTyping(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  // --- 렌더러 함수 (말풍선 분리 로직) ---
  const renderAIMessage = (msg: Message) => {
    const hasData = msg.aiData && msg.aiData.data;
    const { category, data } = msg.aiData || {};

    return (
      <div className="flex flex-col gap-1 max-w-[85%] items-start">
        {/* 1. 텍스트 말풍선 (TTS가 읽는 부분) */}
        <div className="p-3 rounded-2xl bg-muted/50 rounded-tl-none text-sm leading-relaxed whitespace-pre-wrap">
          {msg.content}
        </div>

        {/* 2. 카드 데이터 (TTS 안 읽음, 화면에만 표시) */}
        {hasData && (
          <div className="w-full">
            {(category === '일정생성' || category === '일정조회' || category === '일정삭제') && (
              <ScheduleCard data={data} />
            )}
            {(category === '모임생성' || category === '모임조회') && (
              <MeetingCard data={data} />
            )}
          </div>
        )}

        <span className="text-[10px] text-muted-foreground px-1">
          {formatTime(msg.timestamp)}
        </span>
      </div>
    );
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-background pb-16">
        <header className="page-header">
          <div className="page-header-inner">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-500">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <div>
                <h1 className="page-title">AI 어시스턴트</h1>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden">
          <div ref={scrollRef} className="h-full overflow-y-auto p-4">
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      message.role === 'user'
                        ? 'bg-primary'
                        : 'bg-gradient-to-br from-blue-500 to-purple-500'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <User className="h-4 w-4 text-primary-foreground" />
                    ) : (
                      <Bot className="h-4 w-4 text-white" />
                    )}
                  </div>

                  {message.role === 'user' ? (
                    <div className="flex flex-col gap-1 max-w-[85%] items-end">
                      <div className="p-3 rounded-2xl bg-primary text-primary-foreground rounded-tr-none text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </div>
                      <span className="text-[10px] text-muted-foreground px-1">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                  ) : (
                    renderAIMessage(message)
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="p-3 bg-muted/50 rounded-2xl rounded-tl-none">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        <div className="border-t border-border/40 bg-background/95 backdrop-blur-sm px-3 py-3 pb-safe">
          <div className="flex gap-2 items-center">
            <button
              onClick={toggleListening}
              className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all flex-shrink-0 ${
                isListening
                  ? 'bg-destructive text-destructive-foreground animate-pulse'
                  : 'bg-accent text-muted-foreground hover:text-foreground'
              }`}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="메시지를 입력하세요..."
              disabled={isTyping}
              className="flex-1 px-3 py-2 text-sm bg-accent/40 rounded-xl border border-transparent outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50 disabled:opacity-50 transition-all"
            />

            <button
              onClick={handleSend}
              disabled={isTyping || !input.trim()}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-primary-foreground disabled:opacity-30 hover:bg-primary/90 transition-all flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
