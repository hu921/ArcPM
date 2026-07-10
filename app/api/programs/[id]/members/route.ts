import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'
import { UserRole } from '@/lib/types'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { client, user, error: authError } = await getServerUser(req)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await client
    .from('program_members')
    .select(`
      id,
      user_id,
      role,
      status,
      joined_at,
      user_profiles!program_members_user_id_fkey ( id, email, full_name, created_at )
    `)
    .eq('program_id', params.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const members = (data ?? []).map(row => {
    const raw = row.user_profiles
    const profile = (Array.isArray(raw) ? raw[0] : raw) as {
      id: string
      email: string
      full_name: string
      created_at: string
    } | null
    return {
      membershipId: row.id,
      userId: row.user_id,
      role: row.role,
      joinedAt: row.joined_at,
      fullName: profile?.full_name ?? 'Unknown',
      email: profile?.email ?? '',
    }
  })

  return NextResponse.json(members)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { client, user, error: authError } = await getServerUser(req)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { userId, role } = await req.json()
  if (!userId || !role) {
    return NextResponse.json({ error: 'userId and role required' }, { status: 400 })
  }

  const { data, error } = await client
    .from('program_members')
    .update({ role: role as UserRole })
    .eq('program_id', params.id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
