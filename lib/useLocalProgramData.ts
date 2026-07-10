'use client'

import { useEffect, useState } from 'react'

/** Persists page data to localStorage keyed by active program (survives refresh in demo mode). */
export function useLocalProgramData<T>(
  storageKey: string,
  programId: string | undefined,
  initial: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const key = programId ? `arcpm:${programId}:${storageKey}` : null
  const [data, setData] = useState<T>(initial)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!key) {
      setReady(true)
      return
    }
    try {
      const raw = localStorage.getItem(key)
      if (raw) setData(JSON.parse(raw) as T)
    } catch {
      /* ignore corrupt storage */
    }
    setReady(true)
  }, [key])

  useEffect(() => {
    if (!key || !ready) return
    localStorage.setItem(key, JSON.stringify(data))
  }, [key, data, ready])

  return [data, setData]
}

export function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
