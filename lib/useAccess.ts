import { useAuth } from './AuthContext'
import { ROLE_META, UserRole } from './types'

export function useAccess() {
  const { activeRole } = useAuth()
  const role = (activeRole ?? 'program_ops') as UserRole
  const meta = ROLE_META[role]

  return {
    role,
    canEditRisks:  meta?.canEditRisks  ?? false,
    canEditLaunch: meta?.canEditLaunch ?? false,
    canViewAll:    role === 'program_ops',
    canEditTrack: (trackName: string) => {
      if (!meta) return false
      if (meta.tracks.includes('*')) return true
      return meta.tracks.includes(trackName)
    },
    canViewPage: (slug: string) => {
      if (!meta) return false
      if (meta.views.includes('*')) return true
      return meta.views.includes(slug)
    },
    canEditLaunchDomain: (domain: string) => {
      if (!meta?.canEditLaunch) return false
      if (role === 'program_ops') return true
      if (role === 'marketing') return ['marketing', 'logistics', 'commerce'].includes(domain)
      if (role === 'product') return domain === 'product'
      return false
    },
  }
}
