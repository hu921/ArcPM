'use client'
import { useCallback, useEffect, useState } from 'react'
import { fetchLaunchItemsFromApi } from './api'
import { dbLaunchToLocal } from './programData'
import { LocalLaunchItem } from './types'

export function useProgramLaunchItems(programId: string | undefined) {
  const [items, setItems] = useState<LocalLaunchItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!programId) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const rows = await fetchLaunchItemsFromApi(programId)
      setItems(rows.map(dbLaunchToLocal))
    } catch {
      setError('Failed to load launch items')
      setItems([])
    }
    setLoading(false)
  }, [programId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { items, setItems, loading, error, refresh }
}
