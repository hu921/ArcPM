'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { useAccess } from '@/lib/useAccess'
import { getProgramMembers, updateMemberRole } from '@/lib/supabase'
import EmptyState from '@/components/EmptyState'
import { ROLE_META, ProgramTeamMember, UserRole } from '@/lib/types'
import { useLocalProgramData } from '@/lib/useLocalProgramData'

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

const DEMO_TEAM: ProgramTeamMember[] = [
  { membershipId: 'm1', userId: 'demo', role: 'program_ops', fullName: 'Sara', email: 'sara@signal.pm', joinedAt: '' },
  { membershipId: 'm2', userId: 'u2', role: 'npi', fullName: 'David Cheng', email: 'david@signal.pm', joinedAt: '' },
  { membershipId: 'm3', userId: 'u3', role: 'marketing', fullName: 'Maria', email: 'maria@signal.pm', joinedAt: '' },
  { membershipId: 'm4', userId: 'u4', role: 'product', fullName: 'Alex', email: 'alex@signal.pm', joinedAt: '' },
]

const ROLES: UserRole[] = ['program_ops', 'npi', 'hw_quality', 'marketing', 'product']

export default function UsersPage() {
  const { profile, activeProgram, refreshProfile } = useAuth()
  const { canViewAll } = useAccess()
  const [members, setMembers] = useState<ProgramTeamMember[]>([])
  const [demoMembers, setDemoMembers] = useLocalProgramData<ProgramTeamMember[]>('demo-team-roles', 'global', DEMO_TEAM)
  const [loading, setLoading] = useState(!DEMO_MODE)
  const [error, setError] = useState('')
  const [savedId, setSavedId] = useState<string | null>(null)

  useEffect(() => {
    if (DEMO_MODE) {
      setMembers(demoMembers)
      setLoading(false)
      return
    }
    if (!canViewAll || !activeProgram?.id) {
      setLoading(false)
      return
    }
    async function loadMembers() {
      const { data, error: fetchError } = await getProgramMembers(activeProgram!.id)
      if (!fetchError && data.length > 0) {
        setMembers(data)
        setLoading(false)
        return
      }
      const { fetchProgramMembersFromApi } = await import('@/lib/api')
      const fromApi = await fetchProgramMembersFromApi(activeProgram!.id)
      if (fromApi.length > 0) {
        setMembers(fromApi)
        setError('')
      } else if (fetchError) {
        setError(fetchError.message)
      }
      setLoading(false)
    }
    loadMembers()
  }, [canViewAll, activeProgram?.id, demoMembers])

  async function changeRole(userId: string, role: UserRole) {
    if (!activeProgram) return
    setError('')
    setSavedId(null)

    if (DEMO_MODE) {
      setDemoMembers(prev => prev.map(m => m.userId === userId ? { ...m, role } : m))
      setMembers(prev => prev.map(m => m.userId === userId ? { ...m, role } : m))
      setSavedId(userId)
      return
    }

    const { error: updateError } = await updateMemberRole(activeProgram.id, userId, role)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setMembers(prev => prev.map(m => m.userId === userId ? { ...m, role } : m))
    if (userId === profile?.id) await refreshProfile()
    setSavedId(userId)
  }

  if (!canViewAll && !DEMO_MODE) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="card text-center py-12 text-gray-400 text-sm">
          Users &amp; roles is restricted to Program Ops on this program.
        </div>
      </div>
    )
  }

  const soloTeam = members.length <= 1

  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Team — {activeProgram?.name ?? 'Program'}</h1>
        <p className="text-sm text-gray-400">
          Manage roles for this program · {members.length} member{members.length === 1 ? '' : 's'}
          {DEMO_MODE && ' · demo mode'}
        </p>
      </div>

      {soloTeam && !loading && (
        <EmptyState
          title="You're the only member so far"
          description="Invite teammates to this program. Email invites are coming in Phase 3 — for now share the signup link with your team."
          actionLabel="Copy signup link"
          onAction={() => {
            if (typeof window !== 'undefined') {
              navigator.clipboard.writeText(`${window.location.origin}/signup`)
            }
          }}
        />
      )}

      <div className="card bg-indigo-50/50 border-indigo-100">
        <div className="text-sm text-indigo-800">
          <strong>Roles are per program.</strong> Changing a role here only affects access to{' '}
          <em>{activeProgram?.name ?? 'this program'}</em>. Email invites arrive in Phase 3.
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
      )}

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-2.5">Member</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-2.5">Email</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-2.5">Role</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-2.5">Access</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-400">Loading team…</td>
              </tr>
            )}
            {!loading && members.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-400">No members found for this program.</td>
              </tr>
            )}
            {!loading && members.map((m, i) => {
              const meta = ROLE_META[m.role]
              const isSelf = m.userId === profile?.id
              return (
                <tr key={m.membershipId} className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: meta.color }}>
                        {m.fullName?.charAt(0) ?? '?'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-800">{m.fullName}</div>
                        {isSelf && <div className="text-[10px] text-indigo-500">You</div>}
                        {savedId === m.userId && <div className="text-[10px] text-green-600">Saved</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{m.email}</td>
                  <td className="px-4 py-3">
                    <select
                      className="input-base text-xs py-1"
                      style={{ minHeight: 'unset', height: 32, width: 140 }}
                      value={m.role}
                      onChange={e => changeRole(m.userId, e.target.value as UserRole)}
                    >
                      {ROLES.map(r => (
                        <option key={r} value={r}>{ROLE_META[r].label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(meta.views.includes('*')
                        ? ['All pages']
                        : meta.views.slice(0, 4)
                      ).map(v => (
                        <span key={v} className="badge badge-norisk text-[10px]">{v}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {ROLES.map(r => {
          const meta = ROLE_META[r]
          const count = members.filter(m => m.role === r).length
          return (
            <div key={r} className="card">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: meta.color }} />
                <span className="text-sm font-medium text-gray-800">{meta.label}</span>
                <span className="text-xs text-gray-400 ml-auto">{count}</span>
              </div>
              <p className="text-xs text-gray-400">
                Tracks: {meta.tracks.includes('*') ? 'All' : meta.tracks.join(', ')}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
