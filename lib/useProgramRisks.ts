'use client'
import { useCallback, useEffect, useState } from 'react'
import { fetchRisksFromApi } from './api'
import { dbRiskToLocal } from './programData'
import { LocalRiskItem } from './types'

export function useProgramRisks(programId: string | undefined) {
  const [items, setItems] = useState<LocalRiskItem[]>([])
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
      const rows = await fetchRisksFromApi(programId)
      setItems(rows.map(dbRiskToLocal))
    } catch {
      setError('Failed to load risks')
      setItems([])
    }
    setLoading(false)
  }, [programId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { items, setItems, loading, error, refresh }
}
