'use client'
import { FormEvent, Fragment, useState } from 'react'
import ComponentSelect from '@/components/ComponentSelect'
import ItemFormCard, { EditButton } from '@/components/ItemFormCard'
import EmptyState from '@/components/EmptyState'
import { useAuth } from '@/lib/AuthContext'
import { useAccess } from '@/lib/useAccess'
import { useProgramComponents } from '@/lib/useProgramComponents'
import { useProgramRisks } from '@/lib/useProgramRisks'
import { createRiskViaApi, deleteRiskViaApi, updateRiskViaApi } from '@/lib/api'
import { LocalRiskItem, ProgramComponent, RiskLevel } from '@/lib/types'

const LEVEL_ORDER: RiskLevel[] = ['blocker', 'critical', 'major', 'minor', 'no-risk']
const LEVEL_CLS: Record<RiskLevel, string> = {
  blocker: 'badge badge-blocker', critical: 'badge badge-critical',
  major: 'badge badge-major', minor: 'badge badge-minor', 'no-risk': 'badge badge-norisk',
}

const EMPTY_FORM = {
  track: '',
  area: '',
  statusNote: '',
  mitigation: '',
  level: 'major' as RiskLevel,
  nextCp: '',
}

function toForm(item: LocalRiskItem) {
  return {
    track: item.track,
    area: item.area,
    statusNote: item.statusNote,
    mitigation: item.mitigation,
    level: item.level,
    nextCp: item.nextCp,
  }
}

function RiskFormFields({
  form,
  setForm,
  components,
  loadingComponents,
}: {
  form: typeof EMPTY_FORM
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>
  components: ProgramComponent[]
  loadingComponents: boolean
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Track</label>
          <input className="input-base" value={form.track} onChange={e => setForm(f => ({ ...f, track: e.target.value }))} placeholder="e.g. ME, EE, FW" required />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Component</label>
          <ComponentSelect
            components={components}
            loading={loadingComponents}
            value={form.area}
            required
            onChange={name => setForm(f => ({ ...f, area: name }))}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Risk level</label>
          <select className="input-base" value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value as RiskLevel }))}>
            {LEVEL_ORDER.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Next checkpoint</label>
          <input type="date" className="input-base" value={form.nextCp} onChange={e => setForm(f => ({ ...f, nextCp: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Current status</label>
        <textarea className="input-base resize-none" rows={2} value={form.statusNote} onChange={e => setForm(f => ({ ...f, statusNote: e.target.value }))} placeholder="What is happening now?" />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Mitigation plan</label>
        <textarea className="input-base resize-none" rows={2} value={form.mitigation} onChange={e => setForm(f => ({ ...f, mitigation: e.target.value }))} placeholder="Planned actions to resolve or contain the risk" />
      </div>
    </>
  )
}

export default function RisksPage() {
  const { activeProgram, profile } = useAuth()
  const { canEditRisks } = useAccess()
  const { components, loading: loadingComponents } = useProgramComponents(activeProgram?.id)
  const { items, loading, error: loadError, refresh } = useProgramRisks(activeProgram?.id)
  const [filter, setFilter] = useState<RiskLevel | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)

  const blocker  = items.filter(i => i.level === 'blocker').length
  const critical = items.filter(i => i.level === 'critical').length
  const major    = items.filter(i => i.level === 'major').length
  const visible = filter === 'all' ? items : items.filter(i => i.level === filter)

  function openAdd() {
    setEditingId(null)
    setForm({
      ...EMPTY_FORM,
      area: components[0]?.name ?? '',
    })
    setShowForm(true)
  }

  function openEdit(item: LocalRiskItem) {
    setEditingId(item.id)
    setForm(toForm(item))
    setShowForm(true)
    setExpandedId(null)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  async function saveRisk(e: FormEvent) {
    e.preventDefault()
    if (!form.track.trim() || !form.area.trim() || !activeProgram?.id || !profile?.id) return
    setSaveError('')
    setSaving(true)
    const payload = {
      track: form.track.trim(),
      area: form.area.trim(),
      statusNote: form.statusNote.trim(),
      mitigation: form.mitigation.trim(),
      level: form.level,
      nextCp: form.nextCp,
    }

    if (editingId) {
      const { error } = await updateRiskViaApi(editingId, {
        track: payload.track,
        area: payload.area,
        status_note: payload.statusNote || null,
        mitigation: payload.mitigation || null,
        level: payload.level,
        next_cp: payload.nextCp || null,
      })
      if (error) {
        setSaveError(error)
        setSaving(false)
        return
      }
    } else {
      const { error } = await createRiskViaApi(activeProgram.id, profile.id, payload)
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

  async function removeRisk(id: string) {
    if (editingId === id) closeForm()
    const { error } = await deleteRiskViaApi(id)
    if (error) setSaveError(error)
    else await refresh()
    if (expandedId === id) setExpandedId(null)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Risk Register</h1>
          <p className="text-sm text-gray-400">{activeProgram?.name ?? 'Your program'} · {items.length} item{items.length === 1 ? '' : 's'}</p>
          {(loadError || saveError) && (
            <p className="text-xs text-red-600 mt-1">{saveError || loadError}</p>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <span className="badge badge-blocker">{blocker} Blocker</span>
          <span className="badge badge-critical">{critical} Critical</span>
          <span className="badge badge-major">{major} Major</span>
          {canEditRisks && !showForm && (
            <button type="button" onClick={openAdd} className="btn-secondary ml-2">+ Add risk</button>
          )}
        </div>
      </div>

      {showForm && canEditRisks && (
        <ItemFormCard
          title={editingId ? 'Edit risk item' : 'Add risk item'}
          onSubmit={saveRisk}
          onCancel={closeForm}
          submitLabel={saving ? 'Saving…' : editingId ? 'Save changes' : 'Add to register'}
        >
          <RiskFormFields
            form={form}
            setForm={setForm}
            components={components}
            loadingComponents={loadingComponents}
          />
        </ItemFormCard>
      )}

      {loading && items.length === 0 && !showForm && (
        <p className="text-sm text-gray-400 text-center py-8">Loading risks…</p>
      )}

      {items.length === 0 && !showForm && !loading && (
        <EmptyState
          title="Risk register is empty"
          description="Track blockers, critical issues, and mitigations for your program. Add items manually or populate from AI analysis on Overview."
          actionLabel={canEditRisks ? '+ Add risk' : undefined}
          onAction={canEditRisks ? openAdd : undefined}
        />
      )}

      <div className="flex gap-2 flex-wrap">
        {(['all', ...LEVEL_ORDER] as const).map(l => (
          <button key={l} onClick={() => setFilter(l)} className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${filter === l ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'}`}>
            {l === 'all' ? `All (${items.length})` : l.charAt(0).toUpperCase() + l.slice(1)}
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-2.5 w-16">Track</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-2.5 w-40">Component</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-2.5">Status</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-2.5 w-20">Next CP</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-2.5 w-24">Level</th>
              {canEditRisks && <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-2.5 w-28">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={canEditRisks ? 6 : 5} className="px-4 py-12 text-center text-sm text-gray-400">
                  No risk items yet.{canEditRisks ? ' Click + Add risk above.' : ''}
                </td>
              </tr>
            )}
            {visible.map((r, i) => (
              <Fragment key={r.id}>
                <tr
                  className={`border-b border-gray-50 cursor-pointer hover:bg-indigo-50/40 transition-colors ${editingId === r.id ? 'bg-indigo-50/40' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}
                  onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                >
                  <td className="px-4 py-3 font-medium text-gray-800 text-xs">{r.track}</td>
                  <td className="px-4 py-3 text-gray-700 text-xs font-medium">{r.area}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-sm truncate">{r.statusNote || '—'}</td>
                  <td className="px-4 py-3 text-xs font-medium text-indigo-500">{r.nextCp ? r.nextCp.slice(5) : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={LEVEL_CLS[r.level]}>{r.level.charAt(0).toUpperCase() + r.level.slice(1)}</span>
                  </td>
                  {canEditRisks && (
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <EditButton onClick={() => openEdit(r)} />
                        <button type="button" onClick={e => { e.stopPropagation(); removeRisk(r.id) }} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                      </div>
                    </td>
                  )}
                </tr>
                {expandedId === r.id && (
                  <tr className="bg-indigo-50/30">
                    <td colSpan={canEditRisks ? 6 : 5} className="px-4 py-3">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <div className="font-medium text-gray-600 mb-1">Current status</div>
                          <div className="text-gray-500 leading-relaxed">{r.statusNote || '—'}</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-600 mb-1">Mitigation plan</div>
                          <div className="text-gray-500 leading-relaxed">{r.mitigation || '—'}</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">
        Click a row to expand details.{canEditRisks ? ' Use Edit to change any field.' : ''}
      </p>
    </div>
  )
}
