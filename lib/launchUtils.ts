import { LaunchStatus, LocalLaunchItem } from './types'

export const LAUNCH_STATUS_OPTIONS: LaunchStatus[] = ['ongoing', 'blocked', 'closed']

export const LAUNCH_STATUS_LABEL: Record<LaunchStatus, string> = {
  ongoing: 'On-going',
  blocked: 'Blocked',
  closed: 'Closed',
}

export const LAUNCH_STATUS_CONFIG: Record<
  LaunchStatus,
  { label: string; cls: string; bg: string; icon: string; dotColor: string }
> = {
  ongoing: {
    label: 'On-going',
    cls: 'badge badge-watch',
    bg: 'bg-amber-50',
    icon: '◐',
    dotColor: '#b45309',
  },
  blocked: {
    label: 'Blocked',
    cls: 'badge badge-nogo',
    bg: 'bg-red-50',
    icon: '✕',
    dotColor: '#dc2626',
  },
  closed: {
    label: 'Closed',
    cls: 'badge badge-complete',
    bg: 'bg-gray-100',
    icon: '✓',
    dotColor: '#6b7280',
  },
}

export function launchStatusBadgeClass(status: LaunchStatus): string {
  return LAUNCH_STATUS_CONFIG[status]?.cls ?? 'badge badge-norisk'
}

export function computeLaunchVerdict(items: Pick<LocalLaunchItem, 'status'>[]) {
  if (items.length === 0) {
    return {
      label: 'No checklist yet',
      color: 'text-gray-600',
      bg: 'bg-gray-50 border-gray-200',
      desc: 'Add launch readiness items to track production and ship readiness.',
    }
  }

  const blocked = items.filter(i => i.status === 'blocked').length
  const ongoing = items.filter(i => i.status === 'ongoing').length
  const closed = items.filter(i => i.status === 'closed').length

  if (blocked > 0) {
    return {
      label: 'Not Launch Ready',
      color: 'text-red-600',
      bg: 'bg-red-50 border-red-100',
      desc: `${blocked} blocked item${blocked > 1 ? 's' : ''} must resolve before launch.`,
    }
  }

  if (ongoing > 3) {
    return {
      label: 'Needs Attention',
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-100',
      desc: `${ongoing} items still on-going — review before committing to launch date.`,
    }
  }

  const pct = Math.round((closed / items.length) * 100)
  return {
    label: 'Launch Ready',
    color: 'text-green-600',
    bg: 'bg-green-50 border-green-100',
    desc: `${closed}/${items.length} closed (${pct}%). No blockers — proceed with final launch prep.`,
  }
}

/** Map legacy go/watch/nogo values from old data or imports. */
export function normalizeLaunchStatus(raw: string | null | undefined): LaunchStatus {
  switch (raw) {
    case 'go': return 'closed'
    case 'nogo': return 'blocked'
    case 'watch': return 'ongoing'
    case 'closed':
    case 'blocked':
    case 'ongoing':
      return raw
    default:
      return 'ongoing'
  }
}
