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
    .from('launch_items')
    .select('*')
    .eq('program_id', programId)
    .order('domain')

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
  const label = typeof body.label === 'string' ? body.label.trim() : ''
  if (!programId || !label || !body.domain) {
    return NextResponse.json({ error: 'program_id, domain, and label required' }, { status: 400 })
  }

  const { data, error } = await client
    .from('launch_items')
    .insert({
      program_id: programId,
      domain: body.domain,
      label,
      status: body.status ?? 'ongoing',
      owner: body.owner ?? null,
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
  if (raw.domain !== undefined) updates.domain = raw.domain
  if (raw.label !== undefined) updates.label = String(raw.label).trim()
  if (raw.status !== undefined) updates.status = raw.status
  if (raw.owner !== undefined) updates.owner = raw.owner
  if (raw.note !== undefined) updates.note = raw.note
  updates.updated_at = new Date().toISOString()

  const { data, error } = await client
    .from('launch_items')
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

  const { error } = await client.from('launch_items').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
