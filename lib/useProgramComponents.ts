'use client'
import { useEffect, useState } from 'react'
import { getProgramComponents } from './supabase'
import { ProgramComponent } from './types'

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

const DEMO_COMPONENTS: ProgramComponent[] = [
  { id: 'c1', program_id: 'p1', name: 'Frontend', color: '#378ADD', sort_order: 0, created_by: null, created_at: '' },
  { id: 'c2', program_id: 'p1', name: 'Backend', color: '#7F77DD', sort_order: 1, created_by: null, created_at: '' },
  { id: 'c3', program_id: 'p1', name: 'Auth', color: '#1D9E75', sort_order: 2, created_by: null, created_at: '' },
]

export function useProgramComponents(programId: string | undefined) {
  const [components, setComponents] = useState<ProgramComponent[]>(DEMO_MODE ? DEMO_COMPONENTS : [])
  const [loading, setLoading] = useState(!DEMO_MODE && !!programId)

  useEffect(() => {
    if (DEMO_MODE) {
      setComponents(DEMO_COMPONENTS)
      setLoading(false)
      return
    }
    if (!programId) {
      setComponents([])
      setLoading(false)
      return
    }

    let cancelled = false
    async function load() {
      setLoading(true)
      const { data, error } = await getProgramComponents(programId!)
      if (cancelled) return
      if (!error) {
        setComponents(data)
        setLoading(false)
        return
      }
      const { fetchProgramComponentsFromApi } = await import('./api')
      const fromApi = await fetchProgramComponentsFromApi(programId!)
      setComponents(fromApi)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [programId])

  return { components, loading }
}
