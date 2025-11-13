"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { ProtectedRoute } from "@/components/protected-route"
import { BottomNav } from "@/components/bottom-nav"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ChevronRight, Bell, Moon, Globe, Lock, HelpCircle, LogOut } from "lucide-react"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const { logout } = useAuth()
  const [pushNotifications, setPushNotifications] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(false)

  const handleLogout = async () => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080"
      await fetch(`${API_BASE}/logout`, {
        method: "POST",
        credentials: "include",
      })
      logout()
      router.push("/login")
    } catch (error) {
      console.error("[v0] Logout failed:", error)
      logout()
      router.push("/login")
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-background pb-16">
        <header className="border-b border-border bg-card px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground">설정</h1>
        </header>

        <main className="flex-1 p-4">
          <div className="space-y-6">
            <Card className="p-4">
              <h2 className="mb-4 text-lg font-semibold text-foreground">알림</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label htmlFor="push-notifications" className="text-base">
                        푸시 알림
                      </Label>
                      <p className="text-sm text-muted-foreground">일정 알림을 받습니다</p>
                    </div>
                  </div>
                  <Switch id="push-notifications" checked={pushNotifications} onCheckedChange={setPushNotifications} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label htmlFor="email-notifications" className="text-base">
                        이메일 알림
                      </Label>
                      <p className="text-sm text-muted-foreground">이메일로 알림을 받습니다</p>
                    </div>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h2 className="mb-4 text-lg font-semibold text-foreground">표시</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Moon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label htmlFor="dark-mode" className="text-base">
                        다크 모드
                      </Label>
                      <p className="text-sm text-muted-foreground">어두운 테마를 사용합니다</p>
                    </div>
                  </div>
                  <Switch
                    id="dark-mode"
                    checked={theme === "dark"}
                    onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                  />
                </div>
                <Separator />
                <button className="flex w-full items-center justify-between transition-colors hover:opacity-70">
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <div className="text-left">
                      <Label className="text-base">언어</Label>
                      <p className="text-sm text-muted-foreground">한국어</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
            </Card>

            <Card className="p-4">
              <h2 className="mb-4 text-lg font-semibold text-foreground">계정</h2>
              <div className="space-y-4">
                <button className="flex w-full items-center justify-between transition-colors hover:opacity-70">
                  <div className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                    <div className="text-left">
                      <Label className="text-base">개인정보 보호</Label>
                      <p className="text-sm text-muted-foreground">보안 및 개인정보 설정</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
                <Separator />
                <button className="flex w-full items-center justify-between transition-colors hover:opacity-70">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="h-5 w-5 text-muted-foreground" />
                    <div className="text-left">
                      <Label className="text-base">도움말</Label>
                      <p className="text-sm text-muted-foreground">자주 묻는 질문 및 지원</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
            </Card>

            <Button variant="destructive" className="w-full gap-2" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              로그아웃
            </Button>
          </div>
        </main>

        <BottomNav />
      </div>
    </ProtectedRoute>
  )
}
