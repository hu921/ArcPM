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
    .from('tracks')
    .select('*')
    .eq('program_id', programId)
    .order('created_at', { ascending: true })

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
    .from('tracks')
    .insert({
      program_id: programId,
      name,
      color: body.color ?? '#7F77DD',
      status: body.status ?? 'on-track',
      component: body.component ?? null,
      dri_name: body.dri_name ?? null,
      dri_id: body.dri_id ?? null,
      start_date: body.start_date ?? null,
      end_date: body.end_date ?? null,
      owner_role: body.owner_role ?? null,
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

  const updates: Record<string, string | null> = {}
  if (raw.name !== undefined) updates.name = String(raw.name).trim()
  if (raw.color !== undefined) updates.color = raw.color
  if (raw.status !== undefined) updates.status = raw.status
  if (raw.component !== undefined) updates.component = raw.component
  if (raw.dri_name !== undefined) updates.dri_name = raw.dri_name
  if (raw.dri_id !== undefined) updates.dri_id = raw.dri_id
  if (raw.start_date !== undefined) updates.start_date = raw.start_date
  if (raw.end_date !== undefined) updates.end_date = raw.end_date

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data, error } = await client
    .from('tracks')
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

  const { error } = await client.from('tracks').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
