import { supabase } from './supabase'
import { DbTrack, localCertToDb, localLaunchToDb, localRiskToDb, localTrackToDb } from './programData'
import { CertItem, LocalCertItem, LocalLaunchItem, LocalRiskItem, LocalTimelineTrack, LaunchItem, Program, ProgramComponent, ProgramTeamMember, ProgramWithMembership, RiskItem } from './types'

export async function authFetch(input: RequestInfo, init: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = new Headers(init.headers)
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`)
  }
  return fetch(input, { ...init, headers })
}

/** Load programs via server API (works when client RLS is blocked on new Supabase projects). */
export async function fetchProgramsFromApi(): Promise<ProgramWithMembership[]> {
  const res = await authFetch('/api/programs')
  if (!res.ok) return []
  return res.json()
}

/** Load program members via server API (fallback when client embed/RLS fails). */
export async function fetchProgramMembersFromApi(programId: string): Promise<ProgramTeamMember[]> {
  const res = await authFetch(`/api/programs/${programId}/members`)
  if (!res.ok) return []
  return res.json()
}

export async function fetchProgramComponentsFromApi(programId: string): Promise<ProgramComponent[]> {
  const res = await authFetch(`/api/programs/${programId}/components`)
  if (!res.ok) return []
  return res.json()
}

export async function createProgramComponentViaApi(
  programId: string,
  input: { name: string; color?: string; sortOrder?: number },
): Promise<{ data: ProgramComponent | null; error: string | null }> {
  const res = await authFetch(`/api/programs/${programId}/components`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) return { data: null, error: body.error ?? res.statusText }
  return { data: body as ProgramComponent, error: null }
}

export async function updateProgramComponentViaApi(
  programId: string,
  componentId: string,
  updates: Partial<Pick<ProgramComponent, 'name' | 'color' | 'sort_order'>>,
): Promise<{ data: ProgramComponent | null; error: string | null }> {
  const res = await authFetch(`/api/programs/${programId}/components/${componentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) return { data: null, error: body.error ?? res.statusText }
  return { data: body as ProgramComponent, error: null }
}

export async function deleteProgramComponentViaApi(
  programId: string,
  componentId: string,
): Promise<{ error: string | null }> {
  const res = await authFetch(`/api/programs/${programId}/components/${componentId}`, {
    method: 'DELETE',
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) return { error: body.error ?? res.statusText }
  return { error: null }
}

export async function updateProgramTimelineViaApi(
  programId: string,
  settings: {
    timeline_start?: string | null
    timeline_end?: string | null
    launch_target?: string | null
  },
): Promise<{ data: Program | null; error: string | null }> {
  const res = await authFetch(`/api/programs/${programId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) return { data: null, error: body.error ?? res.statusText }
  return { data: body as Program, error: null }
}

// ─── Tracks ──────────────────────────────────────────────────────────────────

export async function fetchTracksFromApi(programId: string): Promise<DbTrack[]> {
  const res = await authFetch(`/api/tracks?programId=${encodeURIComponent(programId)}`)
  if (!res.ok) return []
  return res.json()
}

export async function createTrackViaApi(
  programId: string,
  track: Pick<LocalTimelineTrack, 'name' | 'color' | 'startDate' | 'endDate' | 'area' | 'status' | 'dri' | 'driId'>,
): Promise<{ data: DbTrack | null; error: string | null }> {
  const res = await authFetch('/api/tracks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(localTrackToDb(track, programId)),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) return { data: null, error: body.error ?? res.statusText }
  return { data: body as DbTrack, error: null }
}

export async function updateTrackViaApi(
  id: string,
  updates: Partial<{
    name: string
    color: string
    status: string
    component: string
    dri_name: string | null
    dri_id: string | null
    start_date: string | null
    end_date: string | null
  }>,
): Promise<{ data: DbTrack | null; error: string | null }> {
  const res = await authFetch('/api/tracks', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updates }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) return { data: null, error: body.error ?? res.statusText }
  return { data: body as DbTrack, error: null }
}

export async function deleteTrackViaApi(id: string): Promise<{ error: string | null }> {
  const res = await authFetch(`/api/tracks?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) return { error: body.error ?? res.statusText }
  return { error: null }
}

// ─── Risks ─────────────────────────────────────────────────────────────────

export async function fetchRisksFromApi(programId: string): Promise<RiskItem[]> {
  const res = await authFetch(`/api/risks?programId=${encodeURIComponent(programId)}`)
  if (!res.ok) return []
  return res.json()
}

export async function createRiskViaApi(
  programId: string,
  userId: string,
  item: Omit<LocalRiskItem, 'id'>,
): Promise<{ data: RiskItem | null; error: string | null }> {
  const res = await authFetch('/api/risks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(localRiskToDb(item, programId, userId)),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) return { data: null, error: body.error ?? res.statusText }
  return { data: body as RiskItem, error: null }
}

export async function updateRiskViaApi(
  id: string,
  updates: Partial<{
    track: string
    area: string
    status_note: string | null
    mitigation: string | null
    level: string
    next_cp: string | null
  }>,
): Promise<{ data: RiskItem | null; error: string | null }> {
  const res = await authFetch('/api/risks', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updates }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) return { data: null, error: body.error ?? res.statusText }
  return { data: body as RiskItem, error: null }
}

export async function deleteRiskViaApi(id: string): Promise<{ error: string | null }> {
  const res = await authFetch(`/api/risks?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) return { error: body.error ?? res.statusText }
  return { error: null }
}

// ─── Launch items ────────────────────────────────────────────────────────────

export async function fetchLaunchItemsFromApi(programId: string): Promise<LaunchItem[]> {
  const res = await authFetch(`/api/launch-items?programId=${encodeURIComponent(programId)}`)
  if (!res.ok) return []
  return res.json()
}

export async function createLaunchItemViaApi(
  programId: string,
  userId: string,
  item: Omit<LocalLaunchItem, 'id'>,
): Promise<{ data: LaunchItem | null; error: string | null }> {
  const res = await authFetch('/api/launch-items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(localLaunchToDb(item, programId, userId)),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) return { data: null, error: body.error ?? res.statusText }
  return { data: body as LaunchItem, error: null }
}

export async function updateLaunchItemViaApi(
  id: string,
  updates: Partial<{
    domain: string
    label: string
    status: string
    owner: string | null
    note: string | null
  }>,
): Promise<{ data: LaunchItem | null; error: string | null }> {
  const res = await authFetch('/api/launch-items', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updates }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) return { data: null, error: body.error ?? res.statusText }
  return { data: body as LaunchItem, error: null }
}

export async function deleteLaunchItemViaApi(id: string): Promise<{ error: string | null }> {
  const res = await authFetch(`/api/launch-items?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) return { error: body.error ?? res.statusText }
  return { error: null }
}

// ─── Certification items ─────────────────────────────────────────────────────

export async function fetchCertItemsFromApi(programId: string): Promise<CertItem[]> {
  const res = await authFetch(`/api/cert-items?programId=${encodeURIComponent(programId)}`)
  if (!res.ok) return []
  return res.json()
}

export async function createCertItemViaApi(
  programId: string,
  userId: string,
  item: Omit<LocalCertItem, 'id'>,
): Promise<{ data: CertItem | null; error: string | null }> {
  const res = await authFetch('/api/cert-items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(localCertToDb(item, programId, userId)),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) return { data: null, error: body.error ?? res.statusText }
  return { data: body as CertItem, error: null }
}

export async function updateCertItemViaApi(
  id: string,
  updates: Partial<{
    name: string
    level: string
    status: string
    target: string | null
    owner: string | null
    region: string
    note: string | null
  }>,
): Promise<{ data: CertItem | null; error: string | null }> {
  const res = await authFetch('/api/cert-items', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updates }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) return { data: null, error: body.error ?? res.statusText }
  return { data: body as CertItem, error: null }
}

export async function deleteCertItemViaApi(id: string): Promise<{ error: string | null }> {
  const res = await authFetch(`/api/cert-items?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) return { error: body.error ?? res.statusText }
  return { error: null }
}
