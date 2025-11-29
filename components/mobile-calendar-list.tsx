"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { Card } from "@/components/ui/card"
import type { Event } from "@/types/calendar"

type MobileCalendarListProps = {
  events: Event[]
  onEventClick: (event: Event) => void
}

export function MobileCalendarList({ events, onEventClick }: MobileCalendarListProps) {
  const [displayedEvents, setDisplayedEvents] = useState<Event[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const loaderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sortedEvents = [...events].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    setDisplayedEvents(sortedEvents.slice(0, 20))
    setCurrentIndex(20)
  }, [events])

  const loadMoreEvents = useCallback(() => {
    if (currentIndex >= events.length) return

    const sortedEvents = [...events].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

    const newEvents = sortedEvents.slice(0, currentIndex + 20)
    setDisplayedEvents(newEvents)
    setCurrentIndex(currentIndex + 20)
  }, [currentIndex, events])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && currentIndex < events.length) {
          loadMoreEvents()
        }
      },
      { threshold: 0.1 },
    )

    if (loaderRef.current) {
      observer.observe(loaderRef.current)
    }

    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current)
      }
    }
  }, [currentIndex, events.length, loadMoreEvents])

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const formatFullDate = (date: Date) => {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    }).format(date)
  }

  const groupedEvents = displayedEvents.reduce(
    (acc, event) => {
      const dateKey = formatFullDate(event.startDate)
      if (!acc[dateKey]) {
        acc[dateKey] = []
      }
      acc[dateKey].push(event)
      return acc
    },
    {} as Record<string, Event[]>,
  )

  return (
    <div className="block md:hidden space-y-4" ref={scrollContainerRef}>
      {Object.entries(groupedEvents).map(([dateKey, dateEvents]) => (
        <div key={dateKey} className="space-y-2">
          <div className="sticky top-0 bg-background/80 backdrop-blur-sm py-2 px-4">
            <h3 className="text-sm font-bold text-muted-foreground">{dateKey}</h3>
          </div>

          {dateEvents.map((event) => (
            <div key={event.id} className="px-4 cursor-pointer group" onClick={() => onEventClick(event)}>
              <Card
                className={`${event.color} p-4 text-white shadow-md hover:shadow-lg transition-all hover:scale-105 group-hover:translate-x-1`}
              >
                <h4 className="font-semibold text-sm line-clamp-2">{event.title}</h4>
                <p className="text-xs opacity-90 mt-1">{formatDate(event.startDate)}</p>
                {event.description && <p className="text-xs opacity-80 mt-2 line-clamp-2">{event.description}</p>}
              </Card>
            </div>
          ))}
        </div>
      ))}

      <div ref={loaderRef} className="flex justify-center items-center py-8">
        {currentIndex < events.length && (
          <div className="text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-primary border-r-transparent mb-2"></div>
            <p className="text-xs text-muted-foreground">더 많은 일정을 불러오는 중...</p>
          </div>
        )}
        {currentIndex >= events.length && displayedEvents.length > 0 && (
          <p className="text-xs text-muted-foreground">모든 일정을 표시했습니다</p>
        )}
      </div>
    </div>
  )
}
