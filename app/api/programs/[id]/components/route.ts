import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { client, user, error: authError } = await getServerUser(req)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await client
    .from('program_components')
    .select('*')
    .eq('program_id', params.id)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { client, user, error: authError } = await getServerUser(req)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) {
    return NextResponse.json({ error: 'Component name is required' }, { status: 400 })
  }

  const color = typeof body.color === 'string' && body.color ? body.color : '#7F77DD'
  const sortOrder = typeof body.sortOrder === 'number' ? body.sortOrder : 0

  const { data, error } = await client
    .from('program_components')
    .insert({
      program_id: params.id,
      name,
      color,
      sort_order: sortOrder,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
