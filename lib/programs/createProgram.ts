import { SupabaseClient } from '@supabase/supabase-js'
import { HARDWARE_TRACKS } from '../programTemplates'
import { Program, ProgramTemplate } from '../types'

export type CreateProgramInput = {
  name: string
  version?: string
  launchTarget?: string
  template?: ProgramTemplate
}

export async function createProgramForUser(
  client: SupabaseClient,
  userId: string,
  input: CreateProgramInput,
) {
  const template = input.template ?? 'hardware'

  const { data: program, error: programError } = await client
    .from('programs')
    .insert({
      name: input.name.trim(),
      version: input.version?.trim() || '',
      launch_target: input.launchTarget || null,
      created_by: userId,
      template,
      status: 'active',
    })
    .select()
    .single()

  if (programError || !program) {
    return { error: programError ?? new Error('Failed to create program'), program: null as Program | null }
  }

  const { error: memberError } = await client.from('program_members').insert({
    program_id: program.id,
    user_id: userId,
    role: 'program_ops',
    status: 'active',
  })

  if (memberError) {
    return { error: memberError, program: null }
  }

  if (template === 'hardware') {
    const { error: tracksError } = await client.from('tracks').insert(
      HARDWARE_TRACKS.map(t => ({
        program_id: program.id,
        name: t.name,
        color: t.color,
        status: t.status,
        owner_role: t.owner_role,
      })),
    )
    if (tracksError) return { error: tracksError, program: null }
  }

  const { error: profileError } = await client
    .from('user_profiles')
    .update({ last_active_program_id: program.id })
    .eq('id', userId)

  if (profileError) return { error: profileError, program: null }

  return { error: null, program: program as Program }
}
