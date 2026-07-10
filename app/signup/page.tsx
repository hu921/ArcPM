'use client'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthCard, { GoogleAuthButton, RoleLegend } from '@/components/AuthCard'
import { signInWithGoogle } from '@/lib/supabase'

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

function SignupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get('token')
  const [error, setError] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleGoogleSignup() {
    if (DEMO_MODE) {
      setError('Google sign-up requires Supabase. Set NEXT_PUBLIC_DEMO_MODE=false and enable Google provider in Supabase Auth settings.')
      return
    }
    setGoogleLoading(true)
    setError('')
    const redirectTo = inviteToken
      ? `${window.location.origin}/auth/callback?token=${encodeURIComponent(inviteToken)}`
      : undefined
    const { error: authError } = await signInWithGoogle(redirectTo)
    if (authError) {
      setError(authError.message)
      setGoogleLoading(false)
    }
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Sign up with Google — then create a program or join your team"
      alternate={{ label: 'Already have an account?', href: '/login', linkText: 'Sign in' }}
      footer={!DEMO_MODE ? <RoleLegend /> : undefined}
    >
      <div className="flex flex-col gap-4">
        {inviteToken && (
          <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-3 text-sm text-indigo-800">
            You&apos;ve been invited to a program. Sign up with the email that received the invite.
          </div>
        )}

        <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-3 text-sm text-indigo-800">
          <strong>Getting started</strong>
          <ol className="mt-2 space-y-1 text-xs text-indigo-700 list-decimal list-inside">
            <li>Connect your Google account</li>
            <li>Confirm your name</li>
            <li>Create a program or accept an invite</li>
          </ol>
        </div>

        <GoogleAuthButton label="Sign up with Google" loading={googleLoading} onClick={handleGoogleSignup} />

        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
        )}

        {DEMO_MODE && (
          <div className="pt-4 border-t border-gray-100">
            <button type="button" onClick={() => router.push('/login')} className="btn-secondary w-full justify-center">
              Back to sign in / demo
            </button>
          </div>
        )}

        <p className="text-[11px] text-gray-400 text-center leading-relaxed">
          By continuing you agree to use ArcPM for your program team.
        </p>
      </div>
    </AuthCard>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Loading…</div>
    }>
      <SignupContent />
    </Suspense>
  )
}
