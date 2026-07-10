import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } },
) {
  const { data, error } = await supabase
    .from('program_invites')
    .select(`
      id, program_id, email, role, token, expires_at,
      programs ( id, name ),
      inviter:user_profiles!program_invites_invited_by_fkey ( full_name )
    `)
    .eq('token', params.token)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Invite not found or expired' }, { status: 404 })
  return NextResponse.json(data)
}
