import { LocalTimelineTrack, TrackStatus } from './types'

export const TRACK_STATUS_OPTIONS: TrackStatus[] = [
  'on-track',
  'at-risk',
  'critical',
  'blocker',
  'complete',
]

export const TRACK_STATUS_LABEL: Record<TrackStatus, string> = {
  'on-track': 'On track',
  'at-risk': 'At risk',
  critical: 'Critical',
  blocker: 'Blocker',
  complete: 'Complete',
}

export function isTrackComplete(status: TrackStatus | string | undefined): boolean {
  return status === 'complete'
}

/** True when end date is before today and the track is not complete. */
export function isTrackDelayed(track: Pick<LocalTimelineTrack, 'endDate' | 'status'>): boolean {
  if (isTrackComplete(track.status)) return false
  const end = track.endDate?.slice(0, 10)
  if (!end) return false
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  return new Date(`${end}T12:00:00`).getTime() < today.getTime()
}

export function trackStatusBadgeClass(status: TrackStatus): string {
  switch (status) {
    case 'blocker': return 'badge-blocker'
    case 'critical': return 'badge-critical'
    case 'at-risk': return 'badge-watch'
    case 'complete': return 'badge-complete'
    default: return 'badge-norisk'
  }
}
