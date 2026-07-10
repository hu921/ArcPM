'use client'
import { FormEvent, useState } from 'react'
import ItemFormCard, { EditButton } from '@/components/ItemFormCard'
import EmptyState from '@/components/EmptyState'
import { useAuth } from '@/lib/AuthContext'
import { useAccess } from '@/lib/useAccess'
import { LocalCertItem, RiskLevel } from '@/lib/types'
import { newId, useLocalProgramData } from '@/lib/useLocalProgramData'

const LEVEL_META: Record<string, { cls: string; bg: string }> = {
  blocker:  { cls: 'badge badge-blocker',  bg: 'border-rose-200 bg-rose-50' },
  critical: { cls: 'badge badge-critical', bg: 'border-red-200 bg-red-50' },
  major:    { cls: 'badge badge-major',    bg: 'border-amber-200 bg-amber-50' },
  minor:    { cls: 'badge badge-minor',    bg: 'border-green-200 bg-green-50' },
  'no-risk': { cls: 'badge badge-norisk', bg: 'border-gray-200 bg-gray-50' },
}

const LEVEL_OPTIONS: RiskLevel[] = ['blocker', 'critical', 'major', 'minor', 'no-risk']

const PHASES = [
  { label: 'Samples ready',  done: false },
  { label: 'Submit to labs', done: false },
  { label: 'Lab testing',    done: false },
  { label: 'Results in',     done: false },
  { label: 'Cert granted',   done: false },
]

const EMPTY_FORM = {
  name: '',
  level: 'major' as RiskLevel,
  status: 'Not started',
  target: '',
  owner: '',
  region: 'Global',
  note: '',
}

function toForm(item: LocalCertItem) {
  return {
    name: item.name,
    level: item.level,
    status: item.status,
    target: item.target,
    owner: item.owner,
    region: item.region,
    note: item.note,
  }
}

function CertFormFields({
  form,
  setForm,
}: {
  form: typeof EMPTY_FORM
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Certification name</label>
          <input className="input-base" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Priority level</label>
          <select className="input-base" value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value as RiskLevel }))}>
            {LEVEL_OPTIONS.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Status</label>
          <input className="input-base" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Target date</label>
          <input className="input-base" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Owner</label>
          <input className="input-base" value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Region</label>
          <input className="input-base" value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Notes</label>
        <textarea className="input-base resize-none" rows={2} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
      </div>
    </>
  )
}

export default function CertPage() {
  const { activeProgram } = useAuth()
  const { canViewPage, canViewAll, role } = useAccess()
  const canEditCert = canViewAll || role === 'npi' || canViewPage('cert')
  const [certs, setCerts] = useLocalProgramData<LocalCertItem[]>(
    'cert-items',
    activeProgram?.id,
    [],
  )
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  function openAdd() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(cert: LocalCertItem) {
    setEditingId(cert.id)
    setForm(toForm(cert))
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  function saveCert(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    const payload = {
      name: form.name.trim(),
      level: form.level,
      status: form.status.trim() || 'Not started',
      target: form.target.trim(),
      owner: form.owner.trim(),
      region: form.region.trim() || 'Global',
      note: form.note.trim(),
    }
    if (editingId) {
      setCerts(prev => prev.map(c => c.id === editingId ? { ...c, ...payload } : c))
    } else {
      setCerts(prev => [...prev, { id: newId(), ...payload }])
    }
    closeForm()
  }

  function removeCert(id: string) {
    if (editingId === id) closeForm()
    setCerts(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Certification Status</h1>
          <p className="text-sm text-gray-400">
            {activeProgram?.name ?? 'Your program'} · {certs.length} certification{certs.length === 1 ? '' : 's'} tracked
          </p>
        </div>
        {canEditCert && !showForm && (
          <button type="button" onClick={openAdd} className="btn-secondary">+ Add certification</button>
        )}
      </div>

      {showForm && canEditCert && (
        <ItemFormCard
          title={editingId ? 'Edit certification' : 'Add certification'}
          onSubmit={saveCert}
          onCancel={closeForm}
          submitLabel={editingId ? 'Save changes' : 'Add certification'}
        >
          <CertFormFields form={form} setForm={setForm} />
        </ItemFormCard>
      )}

      <div className="card">
        <div className="section-title mb-3">Certification pipeline</div>
        <div className="flex items-center gap-0">
          {PHASES.map((ph, i) => (
            <div key={ph.label} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${ph.done ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400 border-2 border-gray-200'}`}>
                  {ph.done ? '✓' : i + 1}
                </div>
                <div className={`text-xs text-center ${ph.done ? 'text-indigo-600 font-medium' : 'text-gray-400'}`}>{ph.label}</div>
              </div>
              {i < PHASES.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1 mb-4 ${ph.done ? 'bg-indigo-300' : 'bg-gray-100'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {certs.length === 0 ? (
        <EmptyState
          title="No certifications tracked"
          description="Add regulatory and compliance certifications to monitor lab testing, submissions, and grant status."
          actionLabel={canEditCert ? '+ Add certification' : undefined}
          onAction={canEditCert ? openAdd : undefined}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {certs.map(c => {
            const meta = LEVEL_META[c.level] ?? LEVEL_META.major
            const isEditing = editingId === c.id
            return (
              <div key={c.id} className={`rounded-xl border p-4 ${meta.bg} ${isEditing ? 'ring-2 ring-indigo-300' : ''}`}>
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="text-sm font-semibold text-gray-900">{c.name}</div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={meta.cls}>{c.level.charAt(0).toUpperCase() + c.level.slice(1)}</span>
                    {canEditCert && (
                      <>
                        <EditButton onClick={() => openEdit(c)} />
                        <button type="button" onClick={() => removeCert(c.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                      </>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 mb-3 text-xs">
                  <div><span className="text-gray-400">Status </span><span className="font-medium text-gray-700">{c.status}</span></div>
                  <div><span className="text-gray-400">Target </span><span className="font-medium text-indigo-600">{c.target || '—'}</span></div>
                  <div><span className="text-gray-400">Owner </span><span className="font-medium text-gray-700">{c.owner || '—'}</span></div>
                  <div><span className="text-gray-400">Region </span><span className="font-medium text-gray-700">{c.region}</span></div>
                </div>
                {c.note && (
                  <div className="text-xs text-gray-500 leading-relaxed border-t border-gray-200 pt-2 mt-2">{c.note}</div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
