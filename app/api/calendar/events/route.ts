// import { NextResponse } from "next/server"

// export async function GET() {
//   try {
//     // TODO: Replace this with your actual backend API call
//     // Example: const response = await fetch('https://your-backend.com/api/calendar/events')

//     // For now, returning empty array - your backend should provide events in this format:
//     // {
//     //   id: string
//     //   summary: string (event title)
//     //   description?: string
//     //   start: { dateTime?: string, date?: string }
//     //   end: { dateTime?: string, date?: string }
//     //   colorId?: string
//     // }

//     return NextResponse.json({ events: [] })
//   } catch (error) {
//     console.error("Calendar events error:", error)
//     return NextResponse.json({ error: "Failed to fetch calendar events" }, { status: 500 })
//   }
// }
