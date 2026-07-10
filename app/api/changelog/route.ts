// app/api/changelog/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { client, user, error: authError } = await getServerUser(req)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const programId = searchParams.get('programId')
  const limit = parseInt(searchParams.get('limit') ?? '50')

  if (!programId) {
    return NextResponse.json({ error: 'programId is required' }, { status: 400 })
  }

  let query = client
    .from('change_log')
    .select(`
      *,
      user_profiles (
        full_name
      )
    `)
    .eq('program_id', programId)
    .order('created_at', { ascending: false })
    .limit(limit)

  const [{ data, error }, { data: members, error: membersError }] = await Promise.all([
    query,
    client
      .from('program_members')
      .select('user_id, role')
      .eq('program_id', programId)
      .eq('status', 'active'),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (membersError) return NextResponse.json({ error: membersError.message }, { status: 500 })

  const roleByUser = new Map((members ?? []).map(m => [m.user_id, m.role]))

  const entries = (data ?? []).map((row: Record<string, unknown> & {
    user_profiles?: { full_name?: string } | null
    created_by?: string
  }) => ({
    ...row,
    created_by_name: row.user_profiles?.full_name ?? 'Unknown',
    created_by_role: row.created_by ? roleByUser.get(row.created_by) ?? null : null,
    user_profiles: undefined,
  }))

  return NextResponse.json(entries)
}
