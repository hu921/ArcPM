import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; componentId: string } },
) {
  const { client, user, error: authError } = await getServerUser(req)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const updates: Record<string, string | number> = {}

  if (typeof body.name === 'string') {
    const name = body.name.trim()
    if (!name) {
      return NextResponse.json({ error: 'Component name cannot be empty' }, { status: 400 })
    }
    updates.name = name
  }
  if (typeof body.color === 'string') updates.color = body.color
  if (typeof body.sort_order === 'number') updates.sort_order = body.sort_order

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await client
    .from('program_components')
    .update(updates)
    .eq('id', params.componentId)
    .eq('program_id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; componentId: string } },
) {
  const { client, user, error: authError } = await getServerUser(req)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await client
    .from('program_components')
    .delete()
    .eq('id', params.componentId)
    .eq('program_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
