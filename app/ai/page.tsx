// app/ai/page.tsx

'use client';

import { useState, useRef, useEffect } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { BottomNav } from '@/components/bottom-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Send, Bot, User, Sparkles, Mic, MicOff } from 'lucide-react';
import { API_BASE } from '@/lib/api'; // API_BASE 상수 가져오기
import { toast } from '@/hooks/use-toast';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

// Web Speech API 타입 정의 (TypeScript용)
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        '안녕하세요! 일정 관리를 도와드리는 AI 어시스턴트입니다. 무엇을 도와드릴까요?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // 음성 인식 관련 상태
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // 스크롤 자동 이동
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // 음성 인식 초기화 (컴포넌트 마운트 시)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
      const SpeechRecognitionConstructor = SpeechRecognition || webkitSpeechRecognition;

      if (SpeechRecognitionConstructor) {
        const recognition = new SpeechRecognitionConstructor();
        recognition.continuous = false; // 한 문장 인식 후 종료 (채팅형식에 적합)
        recognition.interimResults = false; // 중간 결과값 사용 안 함
        recognition.lang = 'ko-KR'; // 한국어 설정

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput((prev) => prev + (prev ? ' ' : '') + transcript);
          setIsListening(false);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
          toast({
            title: "음성 인식 오류",
            description: "음성을 인식하지 못했습니다. 다시 시도해주세요.",
            variant: "destructive"
          });
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  // 음성 인식 토글 함수
  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast({
        title: "지원 불가",
        description: "이 브라우저는 음성 인식을 지원하지 않습니다.",
        variant: "destructive"
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      toast({
        title: "듣고 있어요...",
        description: "말씀해 주세요.",
      });
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
      // ✅ 실제 API 호출 로직
      const response = await fetch(`${API_BASE}/api/ai/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // 백엔드가 기대하는 필드명에 맞춰 수정하세요 (여기선 text로 가정)
        credentials: 'include',
        body: JSON.stringify({ prompt: input }), 
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      
      // 백엔드 응답 구조에 따라 수정 필요 (예: data.message, data.answer 등)
      const aiContent = data.message || JSON.stringify(data); 

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiContent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '죄송합니다. 서버와 통신 중 오류가 발생했습니다.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
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
              <h1 className="text-xl font-bold text-foreground">AI 어시스턴트</h1>
              <p className="text-xs text-muted-foreground">일정 관리 도우미</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden">
          <div ref={scrollRef} className="h-full overflow-y-auto p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
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
                  <div className="flex max-w-[80%] flex-col gap-1">
                    <Card
                      className={`p-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">
                        {message.content}
                      </p>
                    </Card>
                    <span
                      className={`text-xs text-muted-foreground ${
                        message.role === 'user' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <Card className="p-3">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </main>

        <div className="border-t border-border bg-card p-4">
          <div className="flex gap-2">
            {/* ✅ 음성 인식 버튼 추가 */}
            <Button
              variant={isListening ? "destructive" : "outline"}
              size="icon"
              onClick={toggleListening}
              className={`transition-all ${isListening ? 'animate-pulse' : ''}`}
              title={isListening ? "음성 인식 중지" : "음성 인식 시작"}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>

            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === 'Enter' && !e.shiftKey && handleSend()
              }
              placeholder="메시지를 입력하세요..."
              className="flex-1"
              disabled={isTyping}
            />
            <Button
              onClick={handleSend}
              size="icon"
              disabled={isTyping || !input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
