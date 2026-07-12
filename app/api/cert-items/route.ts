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
    .from('cert_items')
    .select('*')
    .eq('program_id', programId)
    .order('name')

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
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!programId || !name) {
    return NextResponse.json({ error: 'program_id and name required' }, { status: 400 })
  }

  const { data, error } = await client
    .from('cert_items')
    .insert({
      program_id: programId,
      name,
      level: body.level ?? 'major',
      status: body.status ?? 'Not started',
      target: body.target ?? null,
      owner: body.owner ?? null,
      region: body.region ?? 'Global',
      note: body.note ?? null,
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
  if (raw.name !== undefined) updates.name = String(raw.name).trim()
  if (raw.level !== undefined) updates.level = raw.level
  if (raw.status !== undefined) updates.status = raw.status
  if (raw.target !== undefined) updates.target = raw.target
  if (raw.owner !== undefined) updates.owner = raw.owner
  if (raw.region !== undefined) updates.region = raw.region
  if (raw.note !== undefined) updates.note = raw.note
  updates.updated_at = new Date().toISOString()

  const { data, error } = await client
    .from('cert_items')
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

  const { error } = await client.from('cert_items').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
