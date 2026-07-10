'use client'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthCard, { GoogleAuthButton, RoleLegend } from '@/components/AuthCard'
import { signIn, signInWithGoogle } from '@/lib/supabase'

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const authError = searchParams.get('error')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(
    authError === 'auth_failed' ? 'Google sign-in failed. Try again or use email.' : '',
  )
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await signIn(email, password)
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/')
    }
  }

  async function handleGoogle() {
    if (DEMO_MODE) {
      setError('Google sign-in requires Supabase. Set NEXT_PUBLIC_DEMO_MODE=false and configure Google OAuth in Supabase.')
      return
    }
    setGoogleLoading(true)
    setError('')
    const { error } = await signInWithGoogle()
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  return (
    <AuthCard
      title="Sign in"
      subtitle="Welcome back to your program workspace"
      alternate={{ label: 'New to ArcPM?', href: '/signup', linkText: 'Create account' }}
      footer={DEMO_MODE ? (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem('demo_entered', '1')
              router.push('/')
            }}
            className="btn-secondary w-full justify-center"
          >
            Continue in demo mode
          </button>
          <p className="text-[11px] text-gray-400 text-center mt-2">Local preview without Supabase</p>
        </div>
      ) : (
        <RoleLegend />
      )}
    >
      <div className="flex flex-col gap-4">
        <GoogleAuthButton label="Continue with Google" loading={googleLoading} onClick={handleGoogle} />

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">or email</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
            <input type="email" className="input-base" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
            <input type="password" className="input-base" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center disabled:opacity-50">
            {loading ? 'Signing in…' : 'Sign in with email'}
          </button>
        </form>
      </div>
    </AuthCard>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
        Loading…
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
