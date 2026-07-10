'use client'
import { FormEvent, useMemo, useState } from 'react'
import GanttChart from '@/components/GanttChart'
import ComponentSelect from '@/components/ComponentSelect'
import ItemFormCard, { EditButton } from '@/components/ItemFormCard'
import EmptyState from '@/components/EmptyState'
import { useAuth } from '@/lib/AuthContext'
import { useAccess } from '@/lib/useAccess'
import { useProgramComponents } from '@/lib/useProgramComponents'
import { useProgramTracks } from '@/lib/useProgramTracks'
import { createTrackViaApi, deleteTrackViaApi, updateTrackViaApi } from '@/lib/api'
import { useRouter } from 'next/navigation'
import { dateToFraction, formatDisplayDate, formatSpanLabel, resolveTimelineSpan } from '@/lib/timelineSpan'
import {
  isTrackDelayed,
  TRACK_STATUS_LABEL,
  TRACK_STATUS_OPTIONS,
  trackStatusBadgeClass,
} from '@/lib/trackUtils'
import { LocalTimelineTrack, ProgramComponent, TrackStatus } from '@/lib/types'

/** Legacy localStorage rows may still have `owner` instead of `area`. */
type StoredTrack = LocalTimelineTrack & { owner?: string }

function trackStatus(track: StoredTrack): TrackStatus {
  return track.status ?? 'on-track'
}

function trackArea(track: StoredTrack): string {
  return track.area ?? track.owner ?? ''
}

function trackDri(track: StoredTrack, fallback: string): string {
  return track.dri ?? fallback
}

const TRACK_COLORS = ['#7F77DD', '#378ADD', '#1D9E75', '#BA7517', '#E24B4A', '#888888']

export default function TimelinePage() {
  const { activeProgram, profile } = useAuth()
  const { canEditTrack, canViewAll } = useAccess()
  const { components, loading: loadingComponents } = useProgramComponents(activeProgram?.id)
  const router = useRouter()

  const span = useMemo(
    () => resolveTimelineSpan(activeProgram),
    [activeProgram?.timeline_start, activeProgram?.timeline_end],
  )

  const dateToFrac = (dateStr: string) => dateToFraction(dateStr, span)

  function emptyForm(compList: ProgramComponent[] = components) {
    const first = compList[0]
    return {
      name: '',
      color: first?.color ?? TRACK_COLORS[0],
      startDate: span.startStr,
      endDate: span.endStr,
      area: first?.name ?? '',
      status: 'on-track' as TrackStatus,
    }
  }

  const { tracks, loading: loadingTracks, error: loadError, refresh } = useProgramTracks(activeProgram?.id)
  const [dateChanged, setDateChanged] = useState<Set<string>>(new Set())
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(() => emptyForm([]))
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)

  const currentDri = {
    name: profile?.full_name ?? 'Unknown',
    id: profile?.id ?? '',
  }

  const canManage = canViewAll || canEditTrack('Hardware')

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm())
    setShowForm(true)
  }

  function openEdit(track: StoredTrack) {
    setEditingId(track.id)
    setForm({
      name: track.name,
      color: track.color,
      startDate: track.startDate,
      endDate: track.endDate,
      area: trackArea(track),
      status: trackStatus(track),
    })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm())
  }

  function markDateChanged(name: string) {
    setDateChanged(prev => new Set(prev).add(name))
  }

  async function updateEndDate(id: string, newDate: string) {
    const track = tracks.find(t => t.id === id)
    if (!track) return
    markDateChanged(track.name)
    const { error } = await updateTrackViaApi(id, {
      end_date: newDate,
      dri_name: currentDri.name,
      dri_id: currentDri.id || null,
    })
    if (error) setSaveError(error)
    else await refresh()
  }

  async function updateStatus(id: string, status: TrackStatus) {
    const { error } = await updateTrackViaApi(id, {
      status,
      dri_name: currentDri.name,
      dri_id: currentDri.id || null,
    })
    if (error) setSaveError(error)
    else await refresh()
  }

  async function saveTrack(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.area.trim() || !activeProgram?.id) return
    setSaveError('')
    setSaving(true)

    const payload = {
      name: form.name.trim(),
      color: form.color,
      startDate: form.startDate,
      endDate: form.endDate,
      area: form.area,
      status: form.status,
      dri: currentDri.name,
      driId: currentDri.id,
    }

    if (editingId) {
      const existing = tracks.find(t => t.id === editingId)
      if (existing && existing.endDate !== payload.endDate) markDateChanged(payload.name)
      const { error } = await updateTrackViaApi(editingId, {
        name: payload.name,
        color: payload.color,
        status: payload.status,
        component: payload.area,
        dri_name: payload.dri,
        dri_id: payload.driId || null,
        start_date: payload.startDate,
        end_date: payload.endDate,
      })
      if (error) {
        setSaveError(error)
        setSaving(false)
        return
      }
    } else {
      const { error } = await createTrackViaApi(activeProgram.id, payload)
      if (error) {
        setSaveError(error)
        setSaving(false)
        return
      }
    }

    await refresh()
    setSaving(false)
    closeForm()
  }

  async function removeTrack(id: string) {
    if (editingId === id) closeForm()
    const { error } = await deleteTrackViaApi(id)
    if (error) setSaveError(error)
    else await refresh()
  }

  function analyzeChanges() {
    const changedTracks = tracks.filter(t => dateChanged.has(t.name))
    const desc = changedTracks.map(t => `${t.name} end date moved to ${t.endDate}`).join('; ')
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pendingAnalysis', desc)
    }
    router.push('/')
  }

  const ganttTracks = tracks.map(t => ({
    name: t.name,
    color: t.color,
    start: Math.min(dateToFrac(t.startDate), dateToFrac(t.endDate)),
    end: Math.max(dateToFrac(t.startDate), dateToFrac(t.endDate)),
    changed: dateChanged.has(t.name),
    delayed: isTrackDelayed(t),
    complete: t.status === 'complete',
  }))

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Program Timeline</h1>
          <p className="text-sm text-gray-400">
            {activeProgram?.name ?? 'Your program'} · {formatSpanLabel(span)}
            {activeProgram?.launch_target
              ? ` · Launch ${formatDisplayDate(activeProgram.launch_target)}`
              : ''}
          </p>
          {!activeProgram?.timeline_start && !activeProgram?.timeline_end && (
            <p className="text-xs text-amber-600 mt-1">
              Using default chart range. Set dates in Program settings to match your program.
            </p>
          )}
          {(loadError || saveError) && (
            <p className="text-xs text-red-600 mt-1">{saveError || loadError}</p>
          )}
        </div>
        <div className="flex gap-2">
          {canManage && !showForm && (
            <button type="button" onClick={openAdd} className="btn-secondary">+ Add track</button>
          )}
          {dateChanged.size > 0 && (
            <button onClick={analyzeChanges} className="btn-primary">
              ✦ Analyze {dateChanged.size} change{dateChanged.size > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>

      {showForm && canManage && (
        <ItemFormCard
          title={editingId ? 'Edit timeline track' : 'Add timeline track'}
          onSubmit={saveTrack}
          onCancel={closeForm}
          submitLabel={saving ? 'Saving…' : editingId ? 'Save changes' : 'Add track'}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Track name</label>
              <input className="input-base" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. DVT1.2 Build, pre-PVT" required />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Component</label>
              <ComponentSelect
                components={components}
                loading={loadingComponents}
                value={form.area}
                required
                onChange={(name, comp) => setForm(f => ({
                  ...f,
                  area: name,
                  color: comp?.color ?? f.color,
                }))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">DRI</label>
              <div className="input-base bg-gray-50 text-gray-700 flex items-center gap-2 cursor-default">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center shrink-0">
                  {currentDri.name.charAt(0)}
                </span>
                <span className="text-sm">{currentDri.name}</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Set from your login account on save</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Status</label>
              <select className="input-base" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as TrackStatus }))}>
                {TRACK_STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{TRACK_STATUS_LABEL[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Start date</label>
              <input type="date" className="input-base" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">End date</label>
              <input type="date" className="input-base" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Bar color</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="h-9 w-12 rounded border border-gray-200 cursor-pointer" />
                <div className="flex gap-1">
                  {TRACK_COLORS.map(c => (
                    <button key={c} type="button" className="w-6 h-6 rounded-full border-2 border-white shadow" style={{ background: c, outline: form.color === c ? '2px solid #6366f1' : undefined }} onClick={() => setForm(f => ({ ...f, color: c }))} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ItemFormCard>
      )}

      <div className="card">
        {loadingTracks ? (
          <p className="text-sm text-gray-400 py-8 text-center">Loading tracks…</p>
        ) : tracks.length === 0 ? (
          <EmptyState
            title="No timeline tracks yet"
            description="Add tracks to build your program Gantt chart. Hardware programs get default tracks on creation — custom tracks can be added here."
            actionLabel={canManage ? '+ Add track' : undefined}
            onAction={canManage ? openAdd : undefined}
          />
        ) : (
          <GanttChart
            tracks={ganttTracks}
            spanStart={activeProgram?.timeline_start}
            spanEnd={activeProgram?.timeline_end}
            launchTarget={activeProgram?.launch_target}
          />
        )}
      </div>

      <div>
        <div className="section-title">Tracks</div>
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-2.5">Track</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-2.5">Component</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-2.5">DRI</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-2.5">Start</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-2.5">End date</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-2.5">Status</th>
                {canManage && <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-2.5 w-28">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {tracks.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 7 : 6} className="px-4 py-10 text-center text-sm text-gray-400">No tracks yet.</td>
                </tr>
              )}
              {tracks.map((raw, i) => {
                const t = raw as StoredTrack
                const area = trackArea(t)
                const dri = trackDri(t, currentDri.name)
                const canEdit = canEditTrack(area || t.name) || canViewAll
                const isDateChanged = dateChanged.has(t.name)
                const isEditing = editingId === t.id
                const status = trackStatus(t)
                const delayed = isTrackDelayed(t)
                return (
                  <tr key={t.id} className={`border-b border-gray-50 ${isEditing ? 'bg-indigo-50/40' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: t.color }} />
                        <span className="font-medium text-gray-800">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{area || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {dri.charAt(0)}
                        </span>
                        <span className="text-xs text-gray-700">{dri}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{t.startDate}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {canEdit ? (
                          <input type="date" value={t.endDate} className="input-base text-sm" style={{ minHeight: 'unset', height: 32, padding: '0 8px', width: 140 }} onChange={e => updateEndDate(t.id, e.target.value)} />
                        ) : (
                          <span className="text-sm text-gray-600">{t.endDate}</span>
                        )}
                        {isDateChanged && (
                          <span className="badge badge-watch text-[10px]" title="End date changed">Date slip</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {canEdit ? (
                          <select
                            className="input-base text-xs py-1"
                            style={{ minHeight: 'unset', height: 32, width: 128 }}
                            value={status}
                            onChange={e => updateStatus(t.id, e.target.value as TrackStatus)}
                          >
                            {TRACK_STATUS_OPTIONS.map(s => (
                              <option key={s} value={s}>{TRACK_STATUS_LABEL[s]}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`badge ${trackStatusBadgeClass(status)}`}>
                            {TRACK_STATUS_LABEL[status]}
                          </span>
                        )}
                        {delayed && (
                          <span className="badge badge-delay text-[10px]" title="End date has passed">
                            Delayed
                          </span>
                        )}
                      </div>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="flex gap-3">
                          <EditButton onClick={() => openEdit(t)} />
                          <button type="button" onClick={() => removeTrack(t.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {dateChanged.size > 0 && (
        <div className="card bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <span className="text-amber-500 text-lg">⚠</span>
            <div>
              <div className="text-sm font-medium text-amber-800 mb-1">{dateChanged.size} track date{dateChanged.size > 1 ? 's' : ''} changed</div>
              <div className="text-sm text-amber-700">
                {Array.from(dateChanged).join(', ')} — click <strong>Analyze changes</strong> for AI impact assessment.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
