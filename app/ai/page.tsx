"use client"

import { useState, useRef, useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route" // add ProtectedRoute
import { BottomNav } from "@/components/bottom-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Send, Bot, User, Sparkles } from "lucide-react"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "안녕하세요! 일정 관리를 도와드리는 AI 어시스턴트입니다. 무엇을 도와드릴까요?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages([...messages, userMessage])
    setInput("")
    setIsTyping(true)

    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "죄송합니다. 현재 AI 기능은 개발 중입니다. 곧 더 나은 서비스로 찾아뵙겠습니다!",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMessage])
      setIsTyping(false)
    }, 1000)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <ProtectedRoute>
      {" "}
      {/* wrap content with ProtectedRoute */}
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
                  className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      message.role === "user" ? "bg-primary" : "bg-gradient-to-br from-blue-500 to-purple-500"
                    }`}
                  >
                    {message.role === "user" ? (
                      <User className="h-4 w-4 text-primary-foreground" />
                    ) : (
                      <Bot className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div className="flex max-w-[80%] flex-col gap-1">
                    <Card
                      className={`p-3 ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-card"}`}
                    >
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    </Card>
                    <span
                      className={`text-xs text-muted-foreground ${message.role === "user" ? "text-right" : "text-left"}`}
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
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="메시지를 입력하세요..."
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
  )
}
