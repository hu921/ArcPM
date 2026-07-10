'use client'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'

export default function InviteOnboardingPage() {
  const router = useRouter()
  const { activeProgram, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
        Loading…
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-md shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Invite your team</h1>
        <p className="text-sm text-gray-400 mb-6">
          {activeProgram
            ? `"${activeProgram.name}" is ready. Invite teammates from Users & roles — email invites coming in Phase 3.`
            : 'Your program is ready.'}
        </p>

        <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-3 text-sm text-indigo-800 mb-6">
          For now, share ArcPM with teammates after they sign up, or wait for the invite-by-email flow in the next release.
        </div>

        <button type="button" onClick={() => router.replace('/')} className="btn-primary w-full justify-center">
          Enter ArcPM
        </button>
        <button type="button" onClick={() => router.replace('/users')} className="btn-secondary w-full justify-center mt-3">
          Go to Users &amp; roles
        </button>
      </div>
    </div>
  )
}
