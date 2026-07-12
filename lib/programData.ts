import { normalizeLaunchStatus } from './launchUtils'
import { CertItem, LocalCertItem, LocalLaunchItem, LocalRiskItem, LocalTimelineTrack, LaunchItem, RiskItem, TrackStatus } from './types'

export interface DbTrack {
  id: string
  program_id: string
  name: string
  color: string
  status: string
  owner_role: string | null
  component: string | null
  dri_name: string | null
  dri_id: string | null
  start_date: string | null
  end_date: string | null
  created_at: string
}

export function dbTrackToLocal(row: DbTrack): LocalTimelineTrack {
  const startDate = row.start_date?.slice(0, 10) ?? ''
  const endDate = row.end_date?.slice(0, 10) ?? ''
  return {
    id: row.id,
    name: row.name,
    color: row.color ?? '#7F77DD',
    startDate,
    endDate,
    area: row.component ?? row.owner_role ?? '',
    status: (row.status as TrackStatus) ?? 'on-track',
    dri: row.dri_name ?? undefined,
    driId: row.dri_id ?? undefined,
    start: 0,
    end: 0,
  }
}

export function localTrackToDb(
  track: Pick<LocalTimelineTrack, 'name' | 'color' | 'startDate' | 'endDate' | 'area' | 'status' | 'dri' | 'driId'>,
  programId: string,
) {
  return {
    program_id: programId,
    name: track.name.trim(),
    color: track.color,
    status: track.status ?? 'on-track',
    component: track.area.trim() || null,
    dri_name: track.dri ?? null,
    dri_id: track.driId || null,
    start_date: track.startDate || null,
    end_date: track.endDate || null,
  }
}

export function dbRiskToLocal(row: RiskItem): LocalRiskItem {
  return {
    id: row.id,
    track: row.track,
    area: row.area,
    statusNote: row.status_note ?? '',
    mitigation: row.mitigation ?? '',
    level: row.level,
    nextCp: row.next_cp?.slice(0, 10) ?? '',
  }
}

export function localRiskToDb(
  item: Omit<LocalRiskItem, 'id'>,
  programId: string,
  userId: string,
) {
  return {
    program_id: programId,
    track: item.track.trim(),
    area: item.area.trim(),
    status_note: item.statusNote.trim() || null,
    mitigation: item.mitigation.trim() || null,
    level: item.level,
    next_cp: item.nextCp || null,
    created_by: userId,
    updated_by: userId,
  }
}

export function dbLaunchToLocal(row: LaunchItem): LocalLaunchItem {
  return {
    id: row.id,
    domain: row.domain as LocalLaunchItem['domain'],
    label: row.label,
    owner: row.owner ?? '',
    note: row.note ?? '',
    status: normalizeLaunchStatus(row.status),
  }
}

export function localLaunchToDb(
  item: Omit<LocalLaunchItem, 'id'>,
  programId: string,
  userId: string,
) {
  return {
    program_id: programId,
    domain: item.domain,
    label: item.label.trim(),
    status: item.status,
    owner: item.owner.trim() || null,
    note: item.note.trim() || null,
    updated_by: userId,
  }
}

export function dbCertToLocal(row: CertItem): LocalCertItem {
  return {
    id: row.id,
    name: row.name,
    level: row.level,
    status: row.status ?? 'Not started',
    target: row.target?.slice(0, 10) ?? '',
    owner: row.owner ?? '',
    region: row.region ?? 'Global',
    note: row.note ?? '',
  }
}

export function localCertToDb(
  item: Omit<LocalCertItem, 'id'>,
  programId: string,
  userId: string,
) {
  return {
    program_id: programId,
    name: item.name.trim(),
    level: item.level,
    status: item.status.trim() || 'Not started',
    target: item.target.trim() || null,
    owner: item.owner.trim() || null,
    region: item.region.trim() || 'Global',
    note: item.note.trim() || null,
    updated_by: userId,
  }
}
