import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

export function createServerSupabase(req: NextRequest): SupabaseClient {
  const authHeader = req.headers.get('authorization')
  const userToken = authHeader?.replace(/^Bearer\s+/i, '').trim()
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // Publishable keys require apikey + user JWT as separate headers for RLS
  const headers: Record<string, string> = {
    apikey: apiKey,
    Authorization: `Bearer ${userToken || apiKey}`,
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, apiKey, {
    global: { headers },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

export async function getServerUser(req: NextRequest) {
  const client = createServerSupabase(req)
  const { data: { user }, error } = await client.auth.getUser()
  return { client, user, error }
}
