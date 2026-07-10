import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { client, user, error: authError } = await getServerUser(req)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const programId = new URL(req.url).searchParams.get('programId')
  if (!programId) {
    return NextResponse.json({ error: 'programId required' }, { status: 400 })
  }

  const { data, error } = await client
    .from('risk_items')
    .select('*')
    .eq('program_id', programId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const { client, user, error: authError } = await getServerUser(req)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const programId = body.program_id
  const track = typeof body.track === 'string' ? body.track.trim() : ''
  const area = typeof body.area === 'string' ? body.area.trim() : ''
  if (!programId || !track || !area) {
    return NextResponse.json({ error: 'program_id, track, and area required' }, { status: 400 })
  }

  const { data, error } = await client
    .from('risk_items')
    .insert({
      program_id: programId,
      track,
      area,
      status_note: body.status_note ?? null,
      mitigation: body.mitigation ?? null,
      level: body.level ?? 'major',
      next_cp: body.next_cp ?? null,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const { client, user, error: authError } = await getServerUser(req)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { id, ...raw } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const updates: Record<string, string | null> = { updated_by: user.id }
  if (raw.track !== undefined) updates.track = String(raw.track).trim()
  if (raw.area !== undefined) updates.area = String(raw.area).trim()
  if (raw.status_note !== undefined) updates.status_note = raw.status_note
  if (raw.mitigation !== undefined) updates.mitigation = raw.mitigation
  if (raw.level !== undefined) updates.level = raw.level
  if (raw.next_cp !== undefined) updates.next_cp = raw.next_cp
  updates.updated_at = new Date().toISOString()

  const { data, error } = await client
    .from('risk_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const { client, user, error: authError } = await getServerUser(req)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await client.from('risk_items').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
