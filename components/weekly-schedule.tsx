"use client"

import type React from "react"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useIsMobile } from "@/hooks/use-mobile"

type TimeSlot = {
  id: string
  day: number
  startTime: string
  endTime: string
  title: string
  color: string
}

const DAYS = ["월", "화", "수", "목", "금", "토", "일"]
const HOURS = Array.from({ length: 9 }, (_, i) => i * 2 + 6) // 6 AM, 8 AM, 10 AM, ... 22 PM
const TIME_OPTIONS = Array.from({ length: 37 }, (_, i) => {
  const totalMinutes = 6 * 60 + i * 30 // Start from 6:00 AM
  const hours = Math.floor(totalMinutes / 60) % 24
  const minutes = totalMinutes % 60
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
})
const COLORS = [
  { value: "bg-blue-500", label: "파랑" },
  { value: "bg-green-500", label: "초록" },
  { value: "bg-purple-500", label: "보라" },
  { value: "bg-orange-500", label: "주황" },
  { value: "bg-pink-500", label: "분홍" },
  { value: "bg-teal-500", label: "청록" },
  { value: "bg-red-500", label: "빨강" },
  { value: "bg-indigo-500", label: "남색" },
]

export function WeeklySchedule() {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([
    {
      id: "1",
      day: 0,
      startTime: "09:00",
      endTime: "10:30",
      title: "회의",
      color: "bg-blue-500",
    },
    {
      id: "2",
      day: 2,
      startTime: "14:00",
      endTime: "16:00",
      title: "수업",
      color: "bg-green-500",
    },
  ])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    startTime: "09:00",
    endTime: "10:00",
    color: "bg-blue-500",
  })
  const isMobile = useIsMobile()

  const openAddDialog = (day: number, time?: string) => {
    setEditingSlot({
      id: "",
      day,
      startTime: time || "09:00",
      endTime: time ? addHour(time) : "10:00",
      title: "",
      color: "bg-blue-500",
    })
    setFormData({
      title: "",
      startTime: time || "09:00",
      endTime: time ? addHour(time) : "10:00",
      color: "bg-blue-500",
    })
    setIsDialogOpen(true)
  }

  const addHour = (time: string) => {
    const [hour, min] = time.split(":").map(Number)
    const newHour = (hour + 1) % 24
    return `${newHour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`
  }

  const openEditDialog = (slot: TimeSlot) => {
    setEditingSlot(slot)
    setFormData({ title: slot.title, startTime: slot.startTime, endTime: slot.endTime, color: slot.color })
    setIsDialogOpen(true)
  }

  const handleSave = () => {
    if (!editingSlot || !formData.title.trim()) return

    if (editingSlot.id) {
      // Edit existing
      setTimeSlots(timeSlots.map((slot) => (slot.id === editingSlot.id ? { ...editingSlot, ...formData } : slot)))
    } else {
      // Add new
      const newSlot: TimeSlot = {
        id: Date.now().toString(),
        day: editingSlot.day,
        ...formData,
      }
      setTimeSlots([...timeSlots, newSlot])
    }
    setIsDialogOpen(false)
    setEditingSlot(null)
  }

  const removeTimeSlot = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setTimeSlots(timeSlots.filter((slot) => slot.id !== id))
  }

  const getSlotPosition = (startTime: string, endTime: string) => {
    const [startHour, startMin] = startTime.split(":").map(Number)
    const [endHour, endMin] = endTime.split(":").map(Number)

    const startMinutes = startHour * 60 + startMin - 6 * 60 // Offset by 6 AM
    const endMinutes = endHour * 60 + endMin - 6 * 60
    const totalMinutes = 18 * 60 // 6 AM to 12 AM = 18 hours

    const top = (startMinutes / totalMinutes) * 100
    const height = ((endMinutes - startMinutes) / totalMinutes) * 100

    return { top: `${Math.max(0, top)}%`, height: `${Math.max(0, height)}%` }
  }

  const timeSlotHeight = 100 / HOURS.length

  return (
    <>
      <Card className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">주간 시간표</h3>
          </div>
          <Badge variant="secondary">{timeSlots.length}개 일정</Badge>
        </div>

        <div className="w-full">
          <div className="w-full">
            <div className="mb-1 grid grid-cols-8 gap-0 border-b border-border">
              <div className="border-r border-border text-xs font-semibold text-muted-foreground p-2">시간</div>
              {DAYS.map((day) => (
                <div key={day} className="border-r border-border text-center last:border-r-0">
                  <div className={`font-bold text-foreground ${isMobile ? "text-xs" : "text-sm"} p-2`}>{day}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-8 gap-0 border border-border">
              {/* Time labels column */}
              <div className="border-r border-border space-y-0">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className={`font-medium text-muted-foreground p-1 h-12 flex items-center justify-center border-b border-border last:border-b-0 ${isMobile ? "text-[9px]" : "text-xs"}`}
                  >
                    {hour.toString().padStart(2, "0")}:00
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {DAYS.map((day, dayIdx) => (
                <div key={day} className="border-r border-border last:border-r-0 space-y-0">
                  {HOURS.map((hour) => {
                    const slotsInThisTimeSlot = timeSlots.filter((slot) => {
                      if (slot.day !== dayIdx) return false
                      const [slotHour] = slot.startTime.split(":").map(Number)
                      return slotHour >= hour && slotHour < hour + 2
                    })

                    return (
                      <div
                        key={hour}
                        className="relative h-12 bg-card/50 cursor-pointer hover:bg-accent/30 transition-colors p-0.5 border-b border-border last:border-b-0"
                        onClick={() => openAddDialog(dayIdx, `${hour.toString().padStart(2, "0")}:00`)}
                      >
                        {slotsInThisTimeSlot.length > 0 && (
                          <div className="space-y-0.5">
                            {slotsInThisTimeSlot.map((slot) => (
                              <div
                                key={slot.id}
                                className={`${slot.color} text-white rounded px-0.5 py-0 font-semibold cursor-pointer hover:shadow-md transition-all group relative text-[8px]`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openEditDialog(slot)
                                }}
                              >
                                <div className="truncate">{slot.title}</div>
                                <button
                                  onClick={(e) => removeTimeSlot(slot.id, e)}
                                  className="absolute -top-2 -right-2 rounded-full bg-destructive p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-2 w-2 text-white" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">
            각 시간 칸을 누르면 일정을 추가할 수 있습니다. 일정을 클릭하면 수정 또는 삭제할 수 있습니다.
          </p>
        </div>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSlot?.id ? "일정 수정" : "일정 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">일정 제목</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="예: 회의, 수업, 운동"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">시작 시간</Label>
                <Select
                  value={formData.startTime}
                  onValueChange={(value) => setFormData({ ...formData, startTime: value })}
                >
                  <SelectTrigger id="startTime">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">종료 시간</Label>
                <Select
                  value={formData.endTime}
                  onValueChange={(value) => setFormData({ ...formData, endTime: value })}
                >
                  <SelectTrigger id="endTime">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">색상</Label>
              <Select value={formData.color} onValueChange={(value) => setFormData({ ...formData, color: value })}>
                <SelectTrigger id="color">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLORS.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div className={`h-4 w-4 rounded ${color.value}`} />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={!formData.title.trim()}>
              저장
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
