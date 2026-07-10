'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function OnboardingIndexPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/onboarding/account')
  }, [router])
  return (
    <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
      Redirecting…
    </div>
  )
}
