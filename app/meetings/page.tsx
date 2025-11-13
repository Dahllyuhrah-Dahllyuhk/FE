"use client"

import { useState } from "react"
import { ProtectedRoute } from "@/components/protected-route" // add ProtectedRoute
import { BottomNav } from "@/components/bottom-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Plus, Calendar, Clock, MapPin, Search, Users } from "lucide-react"

type Meeting = {
  id: string
  title: string
  date: string
  time: string
  location: string
  attendees: number
  status: "upcoming" | "ongoing" | "completed"
}

export default function MeetingsPage() {
  const [meetings] = useState<Meeting[]>([
    {
      id: "1",
      title: "팀 회의",
      date: "2025년 10월 30일",
      time: "10:00 - 11:00",
      location: "회의실 A",
      attendees: 8,
      status: "upcoming",
    },
    {
      id: "2",
      title: "프로젝트 발표",
      date: "2025년 10월 31일",
      time: "14:00 - 16:00",
      location: "대회의실",
      attendees: 15,
      status: "upcoming",
    },
    {
      id: "3",
      title: "주간 스탠드업",
      date: "2025년 10월 28일",
      time: "09:00 - 09:30",
      location: "온라인",
      attendees: 12,
      status: "completed",
    },
    {
      id: "4",
      title: "클라이언트 미팅",
      date: "2025년 10월 29일",
      time: "15:00 - 16:30",
      location: "회의실 B",
      attendees: 5,
      status: "completed",
    },
    {
      id: "5",
      title: "디자인 리뷰",
      date: "2025년 11월 1일",
      time: "11:00 - 12:00",
      location: "온라인",
      attendees: 6,
      status: "upcoming",
    },
  ])

  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  const filteredMeetings = meetings.filter((meeting) => {
    const matchesSearch =
      meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.location.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesTab =
      activeTab === "all" ||
      (activeTab === "upcoming" && meeting.status === "upcoming") ||
      (activeTab === "past" && meeting.status === "completed")

    return matchesSearch && matchesTab
  })

  const getStatusColor = (status: Meeting["status"]) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-500"
      case "ongoing":
        return "bg-green-500"
      case "completed":
        return "bg-muted"
    }
  }

  const getStatusText = (status: Meeting["status"]) => {
    switch (status) {
      case "upcoming":
        return "예정"
      case "ongoing":
        return "진행중"
      case "completed":
        return "완료"
    }
  }

  return (
    <ProtectedRoute>
      {" "}
      {/* wrap content with ProtectedRoute */}
      <div className="flex min-h-screen flex-col bg-background pb-16">
        <header className="border-b border-border bg-card px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">모임 목록</h1>
            <Button size="icon">
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
              <TabsTrigger value="upcoming" className="flex-1">
                예정
              </TabsTrigger>
              <TabsTrigger value="past" className="flex-1">
                지난 모임
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {filteredMeetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold text-foreground">모임이 없습니다</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "검색 결과가 없습니다" : "새로운 모임을 추가해보세요"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMeetings.map((meeting) => (
                <Card key={meeting.id} className="p-4 transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-foreground">{meeting.title}</h3>
                        <Badge variant="outline" className={`${getStatusColor(meeting.status)} border-0 text-white`}>
                          {getStatusText(meeting.status)}
                        </Badge>
                      </div>
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{meeting.date}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{meeting.time}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{meeting.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>참석자 {meeting.attendees}명</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </main>

        <BottomNav />
      </div>
    </ProtectedRoute>
  )
}
