'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { roleLandingPath } from '@/lib/onboarding'
import { acceptProgramInvite, getInviteByToken } from '@/lib/supabase'
import { ProgramInvite, ROLE_META } from '@/lib/types'

function JoinContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const { user, profile, pendingInvite, loading, refreshProfile } = useAuth()
  const [invite, setInvite] = useState<ProgramInvite | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loadingInvite, setLoadingInvite] = useState(true)

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace(token ? `/signup?token=${encodeURIComponent(token)}` : '/signup')
      return
    }
    if (!profile?.account_setup_complete) {
      router.replace(token ? `/onboarding/account?token=${encodeURIComponent(token)}` : '/onboarding/account')
      return
    }

    async function loadInvite() {
      if (token) {
        const { data, error: fetchError } = await getInviteByToken(token)
        if (fetchError || !data) {
          setError('This invite is invalid or has expired.')
          setLoadingInvite(false)
          return
        }
        setInvite(data)
      } else if (pendingInvite) {
        setInvite(pendingInvite)
      } else {
        router.replace('/onboarding/create-program')
        return
      }
      setLoadingInvite(false)
    }

    loadInvite()
  }, [user, profile, loading, token, pendingInvite, router])

  async function handleAccept() {
    const inviteToken = token ?? invite?.token
    if (!inviteToken) return
    setSubmitting(true)
    setError('')

    const { error: acceptError, role } = await acceptProgramInvite(inviteToken)
    if (acceptError) {
      setError(acceptError.message)
      setSubmitting(false)
      return
    }

    await refreshProfile()
    router.replace(role ? roleLandingPath(role) : '/')
  }

  if (loading || loadingInvite) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
        Loading invite…
      </div>
    )
  }

  if (!invite) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-md shadow-sm text-center">
          <p className="text-sm text-red-600">{error || 'Invite not found.'}</p>
        </div>
      </div>
    )
  }

  const roleLabel = ROLE_META[invite.role]?.label ?? invite.role
  const programName = invite.programs?.name ?? 'a program'
  const inviterName = invite.inviter?.full_name ?? 'your team'

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-md shadow-sm">
        <p className="text-xs font-medium text-indigo-600 mb-2">You&apos;re invited</p>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Join {programName}</h1>
        <p className="text-sm text-gray-400 mb-6">
          {inviterName} invited you as <span className="text-gray-700 font-medium">{roleLabel}</span>
        </p>

        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 mb-4">
          <div className="text-xs font-medium text-gray-600 mb-2">You&apos;ll have access to</div>
          <div className="flex flex-wrap gap-1.5">
            {(ROLE_META[invite.role]?.views.includes('*')
              ? ['Overview', 'Timeline', 'Risks', 'Launch', 'Cert', 'Changelog', 'Users']
              : ROLE_META[invite.role]?.views.map(v => v.charAt(0).toUpperCase() + v.slice(1)) ?? []
            ).map(v => (
              <span key={v} className="badge badge-norisk">{v}</span>
            ))}
          </div>
        </div>

        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</div>
        )}

        <button
          type="button"
          onClick={handleAccept}
          disabled={submitting}
          className="btn-primary w-full justify-center disabled:opacity-50"
        >
          {submitting ? 'Joining…' : 'Accept & enter program'}
        </button>
      </div>
    </div>
  )
}

export default function JoinOnboardingPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Loading…</div>
    }>
      <JoinContent />
    </Suspense>
  )
}
