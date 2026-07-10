'use client'
// components/Sidebar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { useAuth } from '@/lib/AuthContext'
import { useAccess } from '@/lib/useAccess'
import { useProgramTracks } from '@/lib/useProgramTracks'
import { formatDisplayDate } from '@/lib/timelineSpan'
import {
  isTrackDelayed,
  TRACK_STATUS_LABEL,
  trackStatusBadgeClass,
} from '@/lib/trackUtils'
import { ROLE_META, TrackStatus, UserRole } from '@/lib/types'

const ALL_NAV = [
  { href: '/',          slug: 'overview',  icon: '⊞', label: 'Overview' },
  { href: '/timeline',  slug: 'timeline',  icon: '◫', label: 'Timeline' },
  { href: '/risks',     slug: 'risks',     icon: '⚠', label: 'Risk register' },
  { href: '/launch',    slug: 'launch',    icon: '🚀', label: 'Launch readiness' },
  { href: '/cert',      slug: 'cert',      icon: '✓', label: 'Certification' },
  { href: '/changelog', slug: 'changelog', icon: '↻', label: 'Change log' },
  { href: '/users',     slug: 'users',     icon: '👥', label: 'Users & roles' },
  { href: '/program/settings', slug: 'program-settings', icon: '⚙', label: 'Program settings' },
]

const STATUS_BADGE: Record<string, string> = {
  blocker:    'badge badge-blocker',
  critical:   'badge badge-critical',
  major:      'badge badge-major',
  minor:      'badge badge-minor',
  'on-track': 'badge badge-go',
  'at-risk':  'badge badge-watch',
  complete:   'badge badge-complete',
}
const STATUS_LABEL: Record<string, string> = {
  blocker: 'Blocker',
  critical: 'Critical',
  major: 'Major',
  minor: 'Minor',
  'on-track': 'On track',
  'at-risk': 'At risk',
  complete: 'Complete',
}

export default function Sidebar() {
  const pathname = usePathname()
  const { profile, programs, activeProgram, setActiveProgram, signOut, activeRole } = useAuth()
  const { canViewPage, canEditTrack, canViewAll } = useAccess()
  const { tracks, loading: loadingTracks } = useProgramTracks(activeProgram?.id)

  const roleMeta = activeRole ? ROLE_META[activeRole as UserRole] : null

  const visibleNav = ALL_NAV.filter(n => {
    if (n.slug === 'program-settings') return canViewAll
    return canViewPage(n.slug)
  })

  function isNavActive(href: string) {
    if (href === '/' && (pathname === '/login' || pathname === '/signup')) return true
    return pathname === href
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 h-screen overflow-y-auto">

      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="text-sm font-semibold text-gray-900">ArcPM</span>
        </div>
        {programs.length > 0 && (
          <>
            <select
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
              value={activeProgram?.id ?? ''}
              onChange={e => {
                const p = programs.find(pr => pr.id === e.target.value)
                if (p) setActiveProgram(p)
              }}
            >
              {programs.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <Link
              href="/onboarding/create-program?new=1"
              className="mt-2 block text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              + New program
            </Link>
          </>
        )}
      </div>

      <nav className="px-3 py-3 flex flex-col gap-0.5">
        <p className="section-title px-2 mb-1">Views</p>
        {visibleNav.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx('nav-item', isNavActive(item.href) && 'nav-item-active')}
          >
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="px-3 py-2">
        <div className="flex items-center justify-between px-2 mb-1">
          <p className="section-title mb-0">Tracks</p>
          <Link href="/timeline" className="text-[10px] text-indigo-600 hover:underline">Timeline</Link>
        </div>
        {loadingTracks ? (
          <p className="text-xs text-gray-400 px-2 py-2">Loading…</p>
        ) : tracks.length === 0 ? (
          <p className="text-xs text-gray-400 px-2 py-2">No tracks yet. Add on Timeline.</p>
        ) : (
          tracks.slice(0, 10).map(t => {
            const component = t.area || t.name
            const owned = canEditTrack(component) || canViewAll
            const status = (t.status ?? 'on-track') as TrackStatus
            const delayed = isTrackDelayed(t)
            return (
              <div
                key={t.id}
                className={clsx(
                  'flex items-center justify-between px-2 py-1.5 rounded-lg cursor-default gap-1',
                  owned ? 'bg-indigo-50/60' : 'hover:bg-gray-50',
                  status === 'complete' && 'opacity-60',
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: status === 'complete' ? '#9CA3AF' : t.color }} />
                  <span className={clsx('text-xs truncate', owned ? 'text-gray-800 font-medium' : 'text-gray-500')}>
                    {t.name}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  {delayed ? (
                    <span className="badge badge-delay text-[9px] px-1.5">Delayed</span>
                  ) : (
                    <span className={`${STATUS_BADGE[status] ?? trackStatusBadgeClass(status)} text-[9px] px-1.5`}>
                      {TRACK_STATUS_LABEL[status] ?? STATUS_LABEL[status] ?? status}
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="mt-auto px-4 py-4 border-t border-gray-100">
        {profile ? (
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
              style={{ background: roleMeta?.color ?? '#7F77DD' }}
            >
              {profile.full_name?.charAt(0) ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-gray-800 truncate">{profile.full_name}</div>
              <div className="text-xs text-gray-400">{roleMeta?.label ?? 'Member'}</div>
            </div>
            <button
              onClick={signOut}
              className="text-xs text-gray-400 hover:text-gray-600 shrink-0"
              title="Sign out"
            >
              ⎋
            </button>
          </div>
        ) : (
          <div className="text-xs text-gray-400">Not signed in</div>
        )}
        <div className="text-xs text-gray-300 mt-2">
          {activeProgram?.name ?? 'Your program'}
          {activeProgram?.launch_target
            ? ` · Launch ${formatDisplayDate(activeProgram.launch_target)}`
            : ''}
        </div>
      </div>
    </aside>
  )
}
