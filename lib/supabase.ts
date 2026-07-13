// lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { createProgramForUser } from './programs/createProgram'
import {
  Program,
  ProgramComponent,
  ProgramInvite,
  ProgramMember,
  ProgramTemplate,
  ProgramWithMembership,
  UserProfile,
  UserRole,
} from './types'

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

function resolveSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  const urlOk = /^https?:\/\//i.test(url)
  const keyOk = key.length > 0 && !key.startsWith('your_')

  if (urlOk && keyOk) return { url, key }

  if (DEMO_MODE) {
    // Valid-shaped placeholders so createClient does not throw during UI preview
    return {
      url: 'https://placeholder.supabase.co',
      key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI4OTZ9.demo',
    }
  }

  throw new Error(
    'Invalid Supabase config. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, or set NEXT_PUBLIC_DEMO_MODE=true.',
  )
}

let _client: SupabaseClient | undefined

function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    const { url, key } = resolveSupabaseConfig()
    _client = createClient(url, key)
  }
  return _client
}

// Lazy so importing this module (e.g. during `next build`'s page-data
// collection) doesn't require env vars — only calling a client method does.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient()
    const value = Reflect.get(client, prop)
    return typeof value === 'function' ? value.bind(client) : value
  },
})

const APP_URL = typeof window !== 'undefined'
  ? window.location.origin
  : process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// ─── Auth helpers ────────────────────────────────────────────────────────────

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signInWithGoogle(redirectTo?: string) {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const token = params.get('token')
  const base = redirectTo ?? `${APP_URL}/auth/callback`
  const destination = token ? `${base}?token=${encodeURIComponent(token)}` : base

  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: destination,
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  })
}

export async function signOut() {
  return supabase.auth.signOut()
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser()
  return data.user
}

// ─── Account & onboarding ────────────────────────────────────────────────────

export async function completeAccountSetup(fullName: string) {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: userError ?? new Error('Not signed in') }

  const { error: profileError } = await supabase
    .from('user_profiles')
    .update({ full_name: fullName, account_setup_complete: true })
    .eq('id', user.id)

  if (profileError) return { error: profileError }

  const { error: metaError } = await supabase.auth.updateUser({
    data: { full_name: fullName },
  })

  return { error: metaError ?? null }
}

/** @deprecated Use completeAccountSetup + program membership flow */
export async function completeOnboarding(fullName: string, _role: UserRole) {
  return completeAccountSetup(fullName)
}

export async function createProgram(input: {
  name: string
  version?: string
  launchTarget?: string
  template?: ProgramTemplate
}) {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: userError ?? new Error('Not signed in'), program: null as Program | null }

  return createProgramForUser(supabase, user.id, input)
}

export async function getInviteByToken(token: string) {
  const { data, error } = await supabase
    .from('program_invites')
    .select(`
      *,
      programs ( id, name ),
      inviter:user_profiles!program_invites_invited_by_fkey ( full_name )
    `)
    .eq('token', token)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (error) return { data: null, error }
  return { data: data as ProgramInvite | null, error: null }
}

export async function getPendingInviteForEmail(email: string) {
  const { data, error } = await supabase
    .from('program_invites')
    .select(`
      *,
      programs ( id, name ),
      inviter:user_profiles!program_invites_invited_by_fkey ( full_name )
    `)
    .eq('email', email.toLowerCase())
    .is('accepted_at', null)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return { data: null, error }
  return { data: data as ProgramInvite | null, error: null }
}

export async function acceptProgramInvite(token: string) {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: userError ?? new Error('Not signed in') }

  const { data: invite, error: inviteError } = await getInviteByToken(token)
  if (inviteError || !invite) {
    return { error: inviteError ?? new Error('Invite not found or expired') }
  }

  if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
    return { error: new Error('This invite was sent to a different email address') }
  }

  const { error: memberError } = await supabase.from('program_members').insert({
    program_id: invite.program_id,
    user_id: user.id,
    role: invite.role,
    status: 'active',
    invited_by: invite.invited_by,
  })

  if (memberError) return { error: memberError }

  const { error: acceptError } = await supabase
    .from('program_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  if (acceptError) return { error: acceptError }

  const { error: profileError } = await supabase
    .from('user_profiles')
    .update({ last_active_program_id: invite.program_id })
    .eq('id', user.id)

  return { error: profileError, programId: invite.program_id, role: invite.role as UserRole }
}

export async function setLastActiveProgram(programId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: new Error('Not signed in') }
  return supabase
    .from('user_profiles')
    .update({ last_active_program_id: programId })
    .eq('id', user.id)
}

// ─── Profile helpers ─────────────────────────────────────────────────────────

export async function getUserProfile(userId: string) {
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data as UserProfile | null
}

export async function getProgramMembers(programId: string) {
  const { data, error } = await supabase
    .from('program_members')
    .select(`
      id,
      user_id,
      role,
      status,
      joined_at,
      user_profiles!program_members_user_id_fkey ( id, email, full_name, created_at )
    `)
    .eq('program_id', programId)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })

  const members = (data ?? []).map(row => {
    const raw = row.user_profiles
    const profile = (Array.isArray(raw) ? raw[0] : raw) as { full_name: string; email: string } | null
    return {
      membershipId: row.id,
      userId: row.user_id,
      role: row.role as UserRole,
      joinedAt: row.joined_at,
      fullName: profile?.full_name ?? 'Unknown',
      email: profile?.email ?? '',
    }
  })

  return { data: members, error }
}

export async function updateMemberRole(programId: string, userId: string, role: UserRole) {
  return supabase
    .from('program_members')
    .update({ role })
    .eq('program_id', programId)
    .eq('user_id', userId)
    .select()
    .single()
}

/** @deprecated Use getProgramMembers for active program */
export async function getAllUserProfiles() {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: true })
  return { data: data ?? [], error }
}

/** @deprecated Use updateMemberRole */
export async function updateUserRole(userId: string, role: UserRole) {
  return supabase
    .from('user_profiles')
    .update({ role })
    .eq('id', userId)
    .select()
    .single()
}

// ─── Program helpers ─────────────────────────────────────────────────────────

export async function getMemberships(userId: string) {
  const { data, error } = await supabase
    .from('program_members')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })

  return { data: (data ?? []) as ProgramMember[], error }
}

export async function getProgramsForUser(userId: string): Promise<ProgramWithMembership[]> {
  const { data, error } = await supabase
    .from('program_members')
    .select(`
      role,
      programs (*)
    `)
    .eq('user_id', userId)
    .eq('status', 'active')

  if (error || !data) return []

  return data
    .filter(row => row.programs && !Array.isArray(row.programs))
    .map(row => ({
      ...(row.programs as unknown as Program),
      memberRole: row.role as UserRole,
    }))
}

/** @deprecated Use getProgramsForUser */
export async function getPrograms() {
  const { data } = await supabase
    .from('programs')
    .select('*')
    .order('created_at', { ascending: true })
  return data ?? []
}

export function isOnboarded(profile: UserProfile | null, memberships: ProgramMember[]): boolean {
  if (!profile?.account_setup_complete) return false
  return memberships.some(m => m.status === 'active')
}

// ─── Program components & timeline ───────────────────────────────────────────

export async function getProgramComponents(programId: string) {
  const { data, error } = await supabase
    .from('program_components')
    .select('*')
    .eq('program_id', programId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  return { data: (data ?? []) as ProgramComponent[], error }
}

export async function createProgramComponent(input: {
  programId: string
  name: string
  color?: string
  sortOrder?: number
}) {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { data: null, error: userError ?? new Error('Not signed in') }

  const { data, error } = await supabase
    .from('program_components')
    .insert({
      program_id: input.programId,
      name: input.name.trim(),
      color: input.color ?? '#7F77DD',
      sort_order: input.sortOrder ?? 0,
      created_by: user.id,
    })
    .select()
    .single()

  return { data: data as ProgramComponent | null, error }
}

export async function updateProgramComponent(
  componentId: string,
  updates: Partial<Pick<ProgramComponent, 'name' | 'color' | 'sort_order'>>,
) {
  const payload: Record<string, string | number> = {}
  if (updates.name !== undefined) payload.name = updates.name.trim()
  if (updates.color !== undefined) payload.color = updates.color
  if (updates.sort_order !== undefined) payload.sort_order = updates.sort_order

  const { data, error } = await supabase
    .from('program_components')
    .update(payload)
    .eq('id', componentId)
    .select()
    .single()

  return { data: data as ProgramComponent | null, error }
}

export async function deleteProgramComponent(componentId: string) {
  return supabase
    .from('program_components')
    .delete()
    .eq('id', componentId)
}

export async function updateProgramTimeline(
  programId: string,
  settings: {
    timeline_start?: string | null
    timeline_end?: string | null
    launch_target?: string | null
  },
) {
  const payload: Record<string, string | null> = {}
  if ('timeline_start' in settings) payload.timeline_start = settings.timeline_start ?? null
  if ('timeline_end' in settings) payload.timeline_end = settings.timeline_end ?? null
  if ('launch_target' in settings) payload.launch_target = settings.launch_target ?? null

  const { data, error } = await supabase
    .from('programs')
    .update(payload)
    .eq('id', programId)
    .select()
    .single()

  return { data: data as Program | null, error }
}
