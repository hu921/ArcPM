import { NextRequest, NextResponse } from 'next/server'
import { createProgramForUser } from '@/lib/programs/createProgram'
import { getAdminClient } from '@/lib/supabase-admin'
import { getServerUser } from '@/lib/supabase-server'
import { ProgramTemplate } from '@/lib/types'

export async function GET(req: NextRequest) {
  const { user, error: authError } = await getServerUser(req)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = getAdminClient()
    const { data, error } = await admin
      .from('program_members')
      .select(`role, programs (*)`)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('joined_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const programs = (data ?? [])
      .filter(row => row.programs && !Array.isArray(row.programs))
      .map(row => ({
        ...(row.programs as object),
        memberRole: row.role,
      }))

    return NextResponse.json(programs)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server configuration error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getServerUser(req)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) {
    return NextResponse.json({ error: 'Program name is required' }, { status: 400 })
  }

  const template = (body.template === 'empty' ? 'empty' : 'hardware') as ProgramTemplate

  try {
    const admin = getAdminClient()
    const { error, program } = await createProgramForUser(admin, user.id, {
      name,
      version: typeof body.version === 'string' ? body.version : undefined,
      launchTarget: typeof body.launchTarget === 'string' ? body.launchTarget : undefined,
      template,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ program, memberRole: 'program_ops' }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server configuration error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
