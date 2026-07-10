'use client'
import { useAuth } from '@/lib/AuthContext'
import { onboardingPath } from '@/lib/onboarding'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Sidebar from './Sidebar'

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

const AUTH_PREFIXES = ['/login', '/signup', '/auth/']
const ONBOARDING_PREFIX = '/onboarding'

function isAuthPath(pathname: string) {
  return AUTH_PREFIXES.some(p => pathname.startsWith(p))
}

function isOnboardingPath(pathname: string) {
  return pathname.startsWith(ONBOARDING_PREFIX)
}

function isPublicPath(pathname: string) {
  return isAuthPath(pathname) || isOnboardingPath(pathname)
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, onboardingStep, needsOnboarding } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const isPublic = isPublicPath(pathname)
  const showSidebar = !isAuthPath(pathname) && !isOnboardingPath(pathname)

  useEffect(() => {
    if (DEMO_MODE) {
      const entered = typeof window !== 'undefined' && sessionStorage.getItem('demo_entered') === '1'
      if (pathname === '/' && !entered) {
        router.replace('/login')
      }
      return
    }
    if (loading) return

    if (!user && !isPublic) {
      router.replace('/login')
      return
    }

    if (user && needsOnboarding && onboardingStep) {
      const target = onboardingPath(onboardingStep)!
      if (pathname !== target && !pathname.startsWith(target + '/')) {
        const params = new URLSearchParams(window.location.search)
        const token = params.get('token')
        router.replace(token ? `${target}?token=${encodeURIComponent(token)}` : target)
      }
      return
    }

    // Fully onboarded users may create additional programs
    if (user && !needsOnboarding && pathname === '/onboarding/account') {
      router.replace('/onboarding/create-program')
      return
    }

    if (user && !needsOnboarding && isPublic) {
      const optionalOnboarding = ['/onboarding/invite', '/onboarding/create-program']
      if (!optionalOnboarding.some(p => pathname.startsWith(p))) {
        router.replace('/')
      }
    }
  }, [user, loading, needsOnboarding, onboardingStep, isPublic, pathname, router])

  if (loading && !DEMO_MODE) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <main className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            Loading ArcPM…
          </div>
        </main>
      </div>
    )
  }

  if (!showSidebar) {
    return (
      <div className="flex min-h-screen bg-gray-50 flex-col">
        <main className="flex-1 flex flex-col">{children}</main>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50 flex flex-col">{children}</main>
    </div>
  )
}
