'use client'
import { useCallback, useEffect, useState } from 'react'
import { fetchTracksFromApi } from './api'
import { dbTrackToLocal } from './programData'
import { LocalTimelineTrack } from './types'

export function useProgramTracks(programId: string | undefined) {
  const [tracks, setTracks] = useState<LocalTimelineTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!programId) {
      setTracks([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const rows = await fetchTracksFromApi(programId)
      setTracks(rows.map(dbTrackToLocal))
    } catch {
      setError('Failed to load tracks')
      setTracks([])
    }
    setLoading(false)
  }, [programId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { tracks, setTracks, loading, error, refresh }
}
