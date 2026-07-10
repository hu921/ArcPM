'use client'
import { FormEvent, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { completeAccountSetup } from '@/lib/supabase'

function AccountForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const { user, profile, loading, refreshProfile } = useAuth()
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace(token ? `/signup?token=${encodeURIComponent(token)}` : '/signup')
      return
    }
    const googleName = user.user_metadata?.full_name as string | undefined
    const emailPrefix = user.email?.split('@')[0] ?? ''
    setFullName(profile?.full_name ?? googleName ?? emailPrefix)
  }, [user, profile, loading, router, token])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) return
    setSubmitting(true)
    setError('')

    const { error: setupError } = await completeAccountSetup(fullName.trim())
    if (setupError) {
      setError(setupError.message)
      setSubmitting(false)
      return
    }

    await refreshProfile()
    const next = token ? `/onboarding/join?token=${encodeURIComponent(token)}` : '/onboarding/create-program'
    router.replace(next)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
        Loading your account…
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-md shadow-sm">
        <p className="text-xs font-medium text-indigo-600 mb-2">Step 1 of 2</p>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Confirm your profile</h1>
        <p className="text-sm text-gray-400 mb-6">
          Signed in as <span className="text-gray-600">{user?.email}</span>
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Full name</label>
            <input
              className="input-base"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              autoFocus
            />
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full justify-center disabled:opacity-50">
            {submitting ? 'Saving…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function AccountOnboardingPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Loading…</div>
    }>
      <AccountForm />
    </Suspense>
  )
}
