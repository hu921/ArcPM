'use client'
import { FormEvent, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { authFetch } from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'
import { ProgramTemplate } from '@/lib/types'

function CreateProgramForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isNewProgram = searchParams.get('new') === '1'
  const { user, programs, loading, refreshProfile } = useAuth()
  const [name, setName] = useState('')
  const [version, setVersion] = useState('')
  const [launchTarget, setLaunchTarget] = useState('')
  const [template, setTemplate] = useState<ProgramTemplate>('hardware')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isFirstProgram = programs.length === 0

  useEffect(() => {
    if (loading) return
    if (!user) router.replace('/signup')
  }, [user, loading, router])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setError('')

    const res = await authFetch('/api/programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        version: version.trim() || undefined,
        launchTarget: launchTarget || undefined,
        template,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Failed to create program')
      setSubmitting(false)
      return
    }

    await refreshProfile()
    if (isFirstProgram && !isNewProgram) {
      router.replace('/onboarding/invite')
    } else {
      router.replace('/')
    }
  }

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
        {!isNewProgram && isFirstProgram && (
          <p className="text-xs font-medium text-indigo-600 mb-2">Step 2 of 2</p>
        )}
        <h1 className="text-xl font-semibold text-gray-900 mb-1">
          {isNewProgram ? 'New program' : 'Create your program'}
        </h1>
        <p className="text-sm text-gray-400 mb-6">
          {isNewProgram
            ? 'Add another program workspace. You\'ll be Program Ops on the new program.'
            : 'Set up a workspace for your team. You\'ll be Program Ops on this program.'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Program name</label>
            <input
              className="input-base"
              placeholder="e.g. Project Phoenix"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Version</label>
              <input
                className="input-base"
                placeholder="v1"
                value={version}
                onChange={e => setVersion(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Launch target</label>
              <input
                type="date"
                className="input-base"
                value={launchTarget}
                onChange={e => setLaunchTarget(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Program template</label>
            <select className="input-base" value={template} onChange={e => setTemplate(e.target.value as ProgramTemplate)}>
              <option value="hardware">Hardware program (default tracks)</option>
              <option value="empty">Empty (add tracks yourself)</option>
            </select>
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full justify-center disabled:opacity-50">
            {submitting ? 'Creating…' : 'Create program'}
          </button>

          {isNewProgram && (
            <button type="button" onClick={() => router.back()} className="btn-secondary w-full justify-center">
              Cancel
            </button>
          )}
        </form>
      </div>
    </div>
  )
}

export default function CreateProgramPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Loading…</div>
    }>
      <CreateProgramForm />
    </Suspense>
  )
}
