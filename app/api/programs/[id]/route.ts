import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { client, user, error: authError } = await getServerUser(req)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const updates: Record<string, string | null> = {}

  if ('timeline_start' in body) {
    updates.timeline_start =
      typeof body.timeline_start === 'string' && body.timeline_start
        ? body.timeline_start
        : null
  }
  if ('timeline_end' in body) {
    updates.timeline_end =
      typeof body.timeline_end === 'string' && body.timeline_end
        ? body.timeline_end
        : null
  }
  if ('launch_target' in body) {
    updates.launch_target =
      typeof body.launch_target === 'string' && body.launch_target
        ? body.launch_target
        : null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await client
    .from('programs')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
