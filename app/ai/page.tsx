'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { BottomNav } from '@/components/bottom-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Mic,
  MicOff,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  ChevronRight, // ✅ UI 개선: 화살표 아이콘 추가
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
  content?: string;
  aiData?: AIResponseData;
  timestamp: Date;
};

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

// --- Sub Components (카드 UI) ---
const BE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8080';
// 1. 일정(Schedule) 카드
const ScheduleCard = ({ data }: { data: any }) => {
  const router = useRouter();
  const events = Array.isArray(data) ? data : [data];

  if (events.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 w-full max-w-[280px] sm:max-w-sm mt-1">
      {events.map((evt: any, idx: number) => {
        const startDate = new Date(evt.start || evt.startTimestamp);
        const endDate = new Date(evt.end || evt.endTimestamp);
        const isAllDay = evt.allDay;

        return (
          <Card 
            key={evt.id || idx} 
            onClick={() => router.push('/')}
            className="border-l-4 overflow-hidden shadow-sm cursor-pointer hover:bg-accent/50 transition-colors active:scale-95 duration-200"
            style={{ borderLeftColor: evt.color || '#3b82f6' }}
          >
            <CardContent className="p-3">
              <div className="flex justify-between items-center mb-1">
                <h4 className="font-bold text-sm truncate flex-1 pr-2">{evt.title || evt.summary || '제목 없음'}</h4>
                {isAllDay && <Badge variant="secondary" className="text-[10px] px-1 shrink-0">종일</Badge>}
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                {evt.description && <p className="line-clamp-1">{evt.description}</p>}
                <div className="flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3 shrink-0" />
                  <span>
                    {format(startDate, 'M월 d일 (E)', { locale: ko })}
                    {!isAllDay && ` ${format(startDate, 'HH:mm')} ~ ${format(endDate, 'HH:mm')}`}
                  </span>
                </div>
                {evt.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{evt.location}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

// 2. 모임(Meeting) 카드 (✅ UI 개선 적용)
const MeetingCard = ({ data }: { data: any }) => {
  const router = useRouter();
  const meetings = Array.isArray(data) ? data : [data];

  if (meetings.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 w-full max-w-[280px] sm:max-w-sm mt-1">
      {meetings.map((meeting: any, idx: number) => {
        const req = meeting.requirement || {};
        const startStr = req.dateRangeStart;
        const endStr = req.dateRangeEnd;
        
        const statusLabels: Record<string, string> = {
          PENDING: '조율 중',
          CONFIRMED: '확정됨',
          CLOSED: '종료됨'
        };

        return (
          <Card 
            key={meeting.id || idx} 
            onClick={() => router.push(`/meetings/${meeting.id}`)}
            className="bg-card shadow-sm cursor-pointer hover:bg-accent/50 transition-all active:scale-95 duration-200 group"
          >
            <CardContent className="p-3">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-1 overflow-hidden">
                  <h4 className="font-bold text-sm truncate">{meeting.name}</h4>
                  {/* ✅ 바로가기 화살표 아이콘 (평소엔 흐리게, 호버시 진하게) */}
                  <ChevronRight className="w-3 h-3 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
                </div>
                <Badge variant={meeting.status === 'CONFIRMED' ? 'default' : 'outline'} className="text-[10px] px-1 shrink-0">
                  {statusLabels[meeting.status] || meeting.status}
                </Badge>
              </div>
              
              <div className="text-xs text-muted-foreground space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>{startStr} ~ {endStr}</span>
                </div>
                
                {meeting.confirmedStart ? (
                   <div className="flex items-center gap-1.5 text-green-600 font-medium">
                     <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                     <span>확정: {format(new Date(meeting.confirmedStart), 'M/d HH:mm')}</span>
                   </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>시간 조율 필요</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span>참여자 {meeting.participants?.length || 0}명</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

// --- Main Component ---

export default function AIPage() {

  useEffect(() => {
    // 1. 브라우저 환경인지 확인
    if (typeof window === 'undefined') return;

    const isTTSAvailable = 'speechSynthesis' in window;
    
    // 2. IWindow 인터페이스를 통해 SpeechRecognition 타입 접근
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const isSTTAvailable = !!(SpeechRecognition || webkitSpeechRecognition);

    // 3. 미지원 기능이 있다면 토스트 알림
    if (!isTTSAvailable || !isSTTAvailable) {
      const missingFeatures = [];
      if (!isTTSAvailable) missingFeatures.push("음성 듣기(TTS)");
      if (!isSTTAvailable) missingFeatures.push("음성 인식(STT)");

      toast({
        title: "브라우저 호환성 안내",
        description: `현재 브라우저는 TTS 기능을 지원하지 않습니다. Chrome 브라우저를 사용해주세요.`,
        variant: "destructive", // 빨간색 알림으로 강조
        duration: 5000, // 5초간 표시
      });
    }
  }, []);

  // ✅ [수정] 초기 환영 메시지를 구체적으로 변경
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
      }
    }
  }, []);

  // --- Web Speech API: TTS (음성 합성) 개선 ---
  const speak = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const synth = window.speechSynthesis;
      
      // 말하고 있던 게 있다면 중단
      if (synth.speaking) {
        synth.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      
      // ✅ [개선] 한국어 목소리 찾기 로직
      // Chrome의 경우 getVoices가 비동기일 수 있어 onvoiceschanged 이벤트나 재시도가 필요할 수 있음
      const setVoice = () => {
        const voices = synth.getVoices();
        // 1순위: Google 한국어, 2순위: 아무 한국어
        const koVoice = voices.find(v => v.lang.includes('ko') && v.name.includes('Google')) 
                     || voices.find(v => v.lang.includes('ko'));
        
        if (koVoice) {
          utterance.voice = koVoice;
        }
        
        utterance.lang = 'ko-KR';
        utterance.rate = 1.0; // 속도 (약간 차분하게 하려면 0.9)
        utterance.pitch = 1.0; 
        
        synth.speak(utterance);
      };

      // 목소리 목록이 로드되어 있으면 바로 실행, 아니면 이벤트 대기
      if (synth.getVoices().length > 0) {
        setVoice();
      } else {
        synth.onvoiceschanged = setVoice;
      }
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast({ title: "지원 불가", description: "이 브라우저는 음성 인식을 지원하지 않아요...", variant: "destructive" });
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      // 내가 말할 때는 TTS 멈춤
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
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

      if (result.category && result.data) {
        aiMessage.aiData = {
          category: result.category,
          data: result.data
        };
        // 백엔드에서 온 summary 사용 (없으면 기본 멘트)
        aiMessage.content = result.summary || '요청하신 작업을 완료했어요.';
      } else {
        aiMessage.content = typeof result.data === 'string' ? result.data : JSON.stringify(result);
      }

      setMessages((prev) => [...prev, aiMessage]);

      // ✅ TTS로 읽어주기
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
        {/* 1. 텍스트 말풍선 */}
        <div className="p-3 rounded-2xl bg-muted/50 rounded-tl-none text-sm leading-relaxed whitespace-pre-wrap">
          {msg.content}
        </div>

        {/* 2. 카드 (말풍선 아래에 위치) */}
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

        {/* 3. 시간 */}
        <span className="text-[10px] text-muted-foreground px-1">
          {formatTime(msg.timestamp)}
        </span>
      </div>
    );
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-background pb-16">
        <header className="border-b border-border bg-card px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">AI로 요청해보세요</h1>
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
                      <div className="p-3 rounded-2xl bg-primary text-primary-foreground rounded-tr-none text-sm leading-relaxed">
                        {message.content}
                      </div>
                      <span className="text-[10px] text-muted-foreground px-1">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                  ) : (
                    // AI 메시지 렌더링 (말풍선 + 카드 분리)
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

        <div className="border-t border-border bg-card p-4">
          <div className="flex gap-2">
            <Button
              variant={isListening ? "destructive" : "outline"}
              size="icon"
              onClick={toggleListening}
              className={`transition-all ${isListening ? 'animate-pulse ring-2 ring-destructive/30' : ''}`}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>

            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="메시지 입력 또는 음성 대화..."
              className="flex-1"
              disabled={isTyping}
            />
            <Button onClick={handleSend} size="icon" disabled={isTyping || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
