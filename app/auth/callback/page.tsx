'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { supabase } from '@/lib/supabase'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [message, setMessage] = useState('Completing sign in…')

  useEffect(() => {
    async function finishAuth() {
      const code = searchParams.get('code')
      const token = searchParams.get('token')
      const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : ''

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (error || !data.session) {
          router.replace('/login?error=auth_failed')
          return
        }
        router.replace(token ? `/onboarding/account${tokenQuery}` : '/')
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace(token ? `/onboarding/account${tokenQuery}` : '/')
      } else {
        setMessage('Sign-in failed. Redirecting…')
        router.replace('/login?error=auth_failed')
      }
    }

    finishAuth()
  }, [router, searchParams])

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
        {message}
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Loading…</div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}
