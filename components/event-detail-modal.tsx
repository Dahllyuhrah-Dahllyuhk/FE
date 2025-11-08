"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import type { Event } from "@/types/calendar"

type EventDetailModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: Event | null
  onDelete: (eventId: string) => void
  onEdit: (event: Event) => void
}

export function EventDetailModal({ open, onOpenChange, event, onDelete, onEdit }: EventDetailModalProps) {
  if (!event) return null

  const handleDelete = () => {
    if (confirm("이 일정을 삭제하시겠습니까?")) {
      onDelete(event.id)
      onOpenChange(false)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`h-4 w-4 rounded-full ${event.color}`}></div>
            {event.title}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground">설명</h3>
            <p className="text-sm text-foreground">{event.description || "설명 없음"}</p>
          </div>

          <div className="grid gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground">시작 시간</h3>
            <p className="text-sm text-foreground">{formatDate(event.startDate)}</p>
          </div>

          <div className="grid gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground">종료 시간</h3>
            <p className="text-sm text-foreground">{formatDate(event.endDate)}</p>
          </div>

          <div className="grid gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground">진행 시간</h3>
            <p className="text-sm text-foreground">
              {(() => {
                const diff = event.endDate.getTime() - event.startDate.getTime()
                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                return `${hours}시간 ${minutes}분`
              })()}
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="destructive" size="sm" onClick={handleDelete} className="sm:mr-auto">
            <Trash2 className="h-4 w-4 mr-2" />
            삭제
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
          <Button
            onClick={() => {
              onEdit(event)
              onOpenChange(false)
            }}
          >
            편집
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
