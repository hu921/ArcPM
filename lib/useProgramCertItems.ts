'use client'
import { useCallback, useEffect, useState } from 'react'
import { fetchCertItemsFromApi } from './api'
import { dbCertToLocal } from './programData'
import { LocalCertItem } from './types'

export function useProgramCertItems(programId: string | undefined) {
  const [items, setItems] = useState<LocalCertItem[]>([])
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
      const rows = await fetchCertItemsFromApi(programId)
      setItems(rows.map(dbCertToLocal))
    } catch {
      setError('Failed to load certifications')
      setItems([])
    }
    setLoading(false)
  }, [programId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { items, setItems, loading, error, refresh }
}
