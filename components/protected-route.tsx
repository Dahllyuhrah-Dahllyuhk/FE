"use client"

import type React from "react"
import { useEffect } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { Suspense } from "react"
import { SplashScreen } from "@/components/splash-screen"

interface ProtectedRouteProps {
  children: React.ReactNode
}

function ProtectedRouteInner({ children }: ProtectedRouteProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !user) {
      // 현재 URL을 redirect 파라미터로 포함해서 로그인 페이지로 이동
      const currentUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
      router.replace(`/login?redirect=${encodeURIComponent(currentUrl)}`)
    }
  }, [user, isLoading, router, pathname, searchParams])

  if (isLoading) {
    return <SplashScreen />
  }

  if (!user) return null

  return <>{children}</>
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  return (
    <Suspense fallback={<SplashScreen />}>
      <ProtectedRouteInner>{children}</ProtectedRouteInner>
    </Suspense>
  )
}
