'use client'
import Link from 'next/link'
import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { useAccess } from '@/lib/useAccess'
import {
  createProgramComponent,
  deleteProgramComponent,
  getProgramComponents,
  updateProgramComponent,
  updateProgramTimeline,
} from '@/lib/supabase'
import { ProgramComponent } from '@/lib/types'
import { formatDisplayDate } from '@/lib/timelineSpan'

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

const DEFAULT_COLORS = ['#7F77DD', '#378ADD', '#1D9E75', '#BA7517', '#E24B4A', '#6366F1']

async function loadComponents(programId: string): Promise<{ data: ProgramComponent[]; error: string }> {
  const { data, error } = await getProgramComponents(programId)
  if (!error) {
    return { data, error: '' }
  }
  const { fetchProgramComponentsFromApi } = await import('@/lib/api')
  const fromApi = await fetchProgramComponentsFromApi(programId)
  return { data: fromApi, error: error.message }
}

async function saveTimeline(
  programId: string,
  settings: {
    timeline_start: string | null
    timeline_end: string | null
    launch_target: string | null
  },
) {
  const { error } = await updateProgramTimeline(programId, settings)
  if (!error) return { error: null }

  const { updateProgramTimelineViaApi } = await import('@/lib/api')
  return updateProgramTimelineViaApi(programId, settings)
}

async function addComponent(
  programId: string,
  input: { name: string; color: string; sortOrder: number },
) {
  const { data, error } = await createProgramComponent({
    programId,
    name: input.name,
    color: input.color,
    sortOrder: input.sortOrder,
  })
  if (data) return { data, error: null }

  const { createProgramComponentViaApi } = await import('@/lib/api')
  return createProgramComponentViaApi(programId, input)
}

async function saveComponent(
  programId: string,
  componentId: string,
  updates: Partial<Pick<ProgramComponent, 'name' | 'color' | 'sort_order'>>,
) {
  const { data, error } = await updateProgramComponent(componentId, updates)
  if (data) return { data, error: null }

  const { updateProgramComponentViaApi } = await import('@/lib/api')
  return updateProgramComponentViaApi(programId, componentId, updates)
}

async function removeComponent(programId: string, componentId: string) {
  const { error } = await deleteProgramComponent(componentId)
  if (!error) return { error: null }

  const { deleteProgramComponentViaApi } = await import('@/lib/api')
  return deleteProgramComponentViaApi(programId, componentId)
}

export default function ProgramSettingsPage() {
  const { activeProgram, refreshProfile } = useAuth()
  const { canViewAll } = useAccess()

  const [components, setComponents] = useState<ProgramComponent[]>([])
  const [loadingComponents, setLoadingComponents] = useState(true)
  const [timelineStart, setTimelineStart] = useState('')
  const [timelineEnd, setTimelineEnd] = useState('')
  const [launchTarget, setLaunchTarget] = useState('')
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(DEFAULT_COLORS[0])
  const [error, setError] = useState('')
  const [savedMsg, setSavedMsg] = useState('')

  const programId = activeProgram?.id

  const syncTimelineFromProgram = useCallback(() => {
    setTimelineStart(activeProgram?.timeline_start?.slice(0, 10) ?? '')
    setTimelineEnd(activeProgram?.timeline_end?.slice(0, 10) ?? '')
    setLaunchTarget(activeProgram?.launch_target?.slice(0, 10) ?? '')
  }, [activeProgram?.timeline_start, activeProgram?.timeline_end, activeProgram?.launch_target])

  useEffect(() => {
    syncTimelineFromProgram()
  }, [syncTimelineFromProgram])

  useEffect(() => {
    if (!canViewAll || !programId || DEMO_MODE) {
      setLoadingComponents(false)
      return
    }

    let cancelled = false
    async function load() {
      setLoadingComponents(true)
      const { data, error: loadError } = await loadComponents(programId!)
      if (cancelled) return
      setComponents(data)
      if (loadError && data.length === 0) setError(loadError)
      setLoadingComponents(false)
    }
    load()
    return () => { cancelled = true }
  }, [canViewAll, programId])

  function flashSaved(message: string) {
    setSavedMsg(message)
    setTimeout(() => setSavedMsg(''), 2500)
  }

  async function handleTimelineSave(e: FormEvent) {
    e.preventDefault()
    if (!programId) return
    setError('')

    if (timelineStart && timelineEnd && timelineStart > timelineEnd) {
      setError('Start date must be before end date.')
      return
    }

    const { error: saveError } = await saveTimeline(programId, {
      timeline_start: timelineStart || null,
      timeline_end: timelineEnd || null,
      launch_target: launchTarget || null,
    })
    if (saveError) {
      setError(saveError)
      return
    }
    await refreshProfile()
    flashSaved('Program dates saved')
  }

  async function handleAddComponent(e: FormEvent) {
    e.preventDefault()
    if (!programId || !newName.trim()) return
    setError('')

    const { data, error: addError } = await addComponent(programId, {
      name: newName.trim(),
      color: newColor,
      sortOrder: components.length,
    })
    if (addError || !data) {
      setError(addError ?? 'Could not add component')
      return
    }
    setComponents(prev => [...prev, data])
    setNewName('')
    flashSaved(`Added ${data.name}`)
  }

  async function handleComponentNameBlur(component: ProgramComponent, name: string) {
    if (!programId || name.trim() === component.name) return
    if (!name.trim()) {
      setError('Component name cannot be empty')
      return
    }
    setError('')
    const { data, error: saveError } = await saveComponent(programId, component.id, { name: name.trim() })
    if (saveError || !data) {
      setError(saveError ?? 'Could not update component')
      return
    }
    setComponents(prev => prev.map(c => (c.id === component.id ? data : c)))
  }

  async function handleComponentColorChange(component: ProgramComponent, color: string) {
    if (!programId) return
    setError('')
    const { data, error: saveError } = await saveComponent(programId, component.id, { color })
    if (saveError || !data) {
      setError(saveError ?? 'Could not update color')
      return
    }
    setComponents(prev => prev.map(c => (c.id === component.id ? data : c)))
  }

  async function handleDeleteComponent(component: ProgramComponent) {
    if (!programId) return
    if (!window.confirm(`Remove component "${component.name}"?`)) return
    setError('')
    const { error: delError } = await removeComponent(programId, component.id)
    if (delError) {
      setError(delError)
      return
    }
    setComponents(prev => prev.filter(c => c.id !== component.id))
    flashSaved(`Removed ${component.name}`)
  }

  if (!canViewAll) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="card text-center py-12 text-gray-400 text-sm">
          Program settings are restricted to Program Ops on this program.
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Program settings</h1>
        <p className="text-sm text-gray-400">
          {activeProgram?.name ?? 'Your program'} · General config, timeline range, and components
        </p>
        {savedMsg && <p className="text-xs text-green-600 mt-1">{savedMsg}</p>}
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>

      <div className="card">
        <div className="section-title mb-3">General</div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-gray-400">Program name</dt>
            <dd className="font-medium text-gray-800">{activeProgram?.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">Version</dt>
            <dd className="font-medium text-gray-800">{activeProgram?.version || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">Launch target</dt>
            <dd className="font-medium text-gray-800">
              {formatDisplayDate(activeProgram?.launch_target)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">Template</dt>
            <dd className="font-medium text-gray-800">{activeProgram?.template ?? '—'}</dd>
          </div>
        </dl>
      </div>

      <form className="card" onSubmit={handleTimelineSave}>
        <div className="section-title mb-2">Timeline &amp; launch</div>
        <p className="text-sm text-gray-500 mb-4">
          Chart range for the Gantt on Timeline, plus your target launch date (shown as a green line on the chart).
        </p>
        {DEMO_MODE ? (
          <p className="text-xs text-gray-400">Not available in demo mode.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Chart start</label>
                <input
                  type="date"
                  className="input-base"
                  value={timelineStart}
                  onChange={e => setTimelineStart(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Chart end</label>
                <input
                  type="date"
                  className="input-base"
                  value={timelineEnd}
                  onChange={e => setTimelineEnd(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Launch target</label>
                <input
                  type="date"
                  className="input-base"
                  value={launchTarget}
                  onChange={e => setLaunchTarget(e.target.value)}
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Must fall between chart start and end to show on the Gantt.
                </p>
              </div>
            </div>
            <button type="submit" className="btn-primary">Save dates</button>
          </>
        )}
      </form>

      <div className="card">
        <div className="section-title mb-2">Components</div>
        <p className="text-sm text-gray-500 mb-4">
          Workstreams for this program (e.g. Frontend, Backend, Auth). Timeline and Risks use this list.
        </p>

        {DEMO_MODE ? (
          <p className="text-xs text-gray-400">Not available in demo mode.</p>
        ) : loadingComponents ? (
          <p className="text-sm text-gray-400">Loading components…</p>
        ) : components.length === 0 ? (
          <p className="text-sm text-gray-400 mb-4">No components yet. Add your first one below.</p>
        ) : (
          <ul className="divide-y divide-gray-100 mb-4">
            {components.map(component => (
              <li key={component.id} className="flex items-center gap-3 py-2.5">
                <input
                  type="color"
                  className="w-8 h-8 rounded border border-gray-200 cursor-pointer shrink-0"
                  value={component.color}
                  onChange={e => handleComponentColorChange(component, e.target.value)}
                  title="Component color"
                />
                <input
                  className="input-base flex-1"
                  defaultValue={component.name}
                  onBlur={e => handleComponentNameBlur(component, e.target.value)}
                />
                <button
                  type="button"
                  className="text-xs text-red-500 hover:text-red-700 shrink-0"
                  onClick={() => handleDeleteComponent(component)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {!DEMO_MODE && (
          <form className="flex flex-wrap items-end gap-3 pt-2 border-t border-gray-100" onSubmit={handleAddComponent}>
            <div className="flex-1 min-w-[140px]">
              <label className="text-xs text-gray-500 mb-1 block">New component</label>
              <input
                className="input-base"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Backend"
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Color</label>
              <input
                type="color"
                className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
                value={newColor}
                onChange={e => setNewColor(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-secondary">Add component</button>
          </form>
        )}
      </div>

      <div className="card">
        <div className="section-title mb-2">Team</div>
        <p className="text-sm text-gray-500 mb-3">Manage members and roles for this program.</p>
        <Link href="/users" className="btn-secondary inline-flex">Open Users &amp; roles</Link>
      </div>
    </div>
  )
}
