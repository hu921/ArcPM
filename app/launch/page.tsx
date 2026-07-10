'use client'
import { FormEvent, useState } from 'react'
import ItemFormCard, { EditButton } from '@/components/ItemFormCard'
import EmptyState from '@/components/EmptyState'
import { useAuth } from '@/lib/AuthContext'
import { useAccess } from '@/lib/useAccess'
import { createLaunchItemViaApi, deleteLaunchItemViaApi, updateLaunchItemViaApi } from '@/lib/api'
import { useProgramLaunchItems } from '@/lib/useProgramLaunchItems'
import {
  computeLaunchVerdict,
  LAUNCH_STATUS_CONFIG,
  LAUNCH_STATUS_LABEL,
  LAUNCH_STATUS_OPTIONS,
} from '@/lib/launchUtils'
import { AiLaunchResult, LaunchDomain, LaunchStatus, LocalLaunchItem } from '@/lib/types'

const DOMAIN_META: Record<LaunchDomain, { label: string; icon: string; color: string }> = {
  product:   { label: 'Product & Features',       icon: '⌚', color: '#7F77DD' },
  marketing: { label: 'Marketing',                icon: '📣', color: '#1D9E75' },
  logistics: { label: 'Logistics & Supply Chain', icon: '🚚', color: '#BA7517' },
  commerce:  { label: 'Commerce & GTM',           icon: '🛒', color: '#378ADD' },
}

const ALL_DOMAINS = Object.keys(DOMAIN_META) as LaunchDomain[]

const EMPTY_FORM = {
  domain: 'product' as LaunchDomain,
  label: '',
  owner: '',
  note: '',
  status: 'ongoing' as LaunchStatus,
}

type LaunchView = 'overview' | 'domain' | 'item'

function toForm(item: LocalLaunchItem) {
  return {
    domain: item.domain,
    label: item.label,
    owner: item.owner,
    note: item.note,
    status: item.status,
  }
}

function BackNav({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium mb-4"
    >
      <span aria-hidden>←</span>
      {label}
    </button>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-gray-500 mb-1">{label}</div>
      <div className="text-sm text-gray-800">{value || '—'}</div>
    </div>
  )
}

export default function LaunchPage() {
  const { activeProgram, user } = useAuth()
  const { canEditLaunch, canEditLaunchDomain, canViewAll } = useAccess()
  const { items, loading: listLoading, error: loadError, refresh } = useProgramLaunchItems(activeProgram?.id)

  const [view, setView] = useState<LaunchView>('overview')
  const [selectedDomain, setSelectedDomain] = useState<LaunchDomain | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  const [aiLoading, setAiLoading] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [aiResult, setAiResult] = useState<AiLaunchResult | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const editableDomains = ALL_DOMAINS.filter(d => canEditLaunchDomain(d))
  const formDomains = editingId ? ALL_DOMAINS : editableDomains

  const selectedItem = selectedItemId ? items.find(i => i.id === selectedItemId) ?? null : null
  const domainItems = selectedDomain ? items.filter(it => it.domain === selectedDomain) : []

  function goOverview() {
    setView('overview')
    setSelectedDomain(null)
    setSelectedItemId(null)
    closeForm()
  }

  function goDomain(domain: LaunchDomain) {
    setView('domain')
    setSelectedDomain(domain)
    setSelectedItemId(null)
    closeForm()
  }

  function goItem(item: LocalLaunchItem) {
    setView('item')
    setSelectedDomain(item.domain)
    setSelectedItemId(item.id)
    closeForm()
  }

  function openAdd(domain?: LaunchDomain) {
    setEditingId(null)
    setForm({
      ...EMPTY_FORM,
      domain: domain ?? editableDomains[0] ?? 'product',
    })
    setShowForm(true)
  }

  function openEdit(item: LocalLaunchItem) {
    setEditingId(item.id)
    setForm(toForm(item))
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  async function saveItem(e: FormEvent) {
    e.preventDefault()
    if (!form.label.trim() || !activeProgram?.id) {
      setSaveError('Enter a checklist item label.')
      return
    }
    if (!user?.id) {
      setSaveError('You must be signed in to save changes.')
      return
    }
    setSaveError('')
    setSaving(true)
    const payload = {
      domain: form.domain,
      label: form.label.trim(),
      owner: form.owner.trim(),
      note: form.note.trim(),
      status: form.status,
    }

    if (editingId) {
      const { error } = await updateLaunchItemViaApi(editingId, {
        domain: payload.domain,
        label: payload.label,
        status: payload.status,
        owner: payload.owner || null,
        note: payload.note || null,
      })
      if (error) {
        setSaveError(error)
        setSaving(false)
        return
      }
    } else {
      const { error } = await createLaunchItemViaApi(activeProgram.id, user.id, payload)
      if (error) {
        setSaveError(error)
        setSaving(false)
        return
      }
    }

    await refresh()
    setSaving(false)
    closeForm()

    if (!editingId && view === 'domain' && selectedDomain && payload.domain !== selectedDomain) {
      goDomain(payload.domain)
    }
  }

  async function removeItem(id: string) {
    const item = items.find(i => i.id === id)
    if (editingId === id) closeForm()
    const { error } = await deleteLaunchItemViaApi(id)
    if (error) {
      setSaveError(error)
      return
    }
    await refresh()
    if (view === 'item' && selectedItemId === id) {
      if (item) goDomain(item.domain)
      else goOverview()
    }
  }

  function canEditItem(item: LocalLaunchItem) {
    return canViewAll || canEditLaunchDomain(item.domain)
  }

  const closed = items.filter(i => i.status === 'closed').length
  const ongoing = items.filter(i => i.status === 'ongoing').length
  const blocked = items.filter(i => i.status === 'blocked').length
  const pct = items.length ? Math.round((closed / items.length) * 100) : 0
  const verdict = computeLaunchVerdict(items)

  async function analyzeReadiness() {
    if (items.length === 0) return
    setAiLoading(true)
    setAiResult(null)
    try {
      const res = await fetch('/api/analyze-launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      setAiResult(await res.json())
    } finally {
      setAiLoading(false)
    }
  }

  function domainStats(domain: LaunchDomain) {
    const domainItemsAll = items.filter(it => it.domain === domain)
    const dClosed = domainItemsAll.filter(i => i.status === 'closed').length
    const dBlocked = domainItemsAll.filter(i => i.status === 'blocked').length
    const dPct = domainItemsAll.length ? Math.round((dClosed / domainItemsAll.length) * 100) : 0
    return { count: domainItemsAll.length, closed: dClosed, blocked: dBlocked, pct: dPct }
  }

  function renderAddForm() {
    if (!showForm || !canEditLaunch) return null
    return (
      <ItemFormCard
        title={editingId ? 'Edit launch item' : 'Add launch checklist item'}
        onSubmit={saveItem}
        onCancel={closeForm}
        submitLabel={saving ? 'Saving…' : editingId ? 'Save changes' : 'Add item'}
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Domain</label>
            <select
              className="input-base"
              value={form.domain}
              onChange={e => setForm(f => ({ ...f, domain: e.target.value as LaunchDomain }))}
            >
              {formDomains.map(d => (
                <option key={d} value={d}>{DOMAIN_META[d].label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Status</label>
            <select
              className="input-base"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as LaunchStatus }))}
            >
              {LAUNCH_STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{LAUNCH_STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-500 mb-1 block">Checklist item</label>
            <input
              className="input-base"
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Owner</label>
            <input
              className="input-base"
              value={form.owner}
              onChange={e => setForm(f => ({ ...f, owner: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Note</label>
            <input
              className="input-base"
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            />
          </div>
        </div>
      </ItemFormCard>
    )
  }

  function renderOverview() {
    return (
      <>
        <div className={`card border flex items-center gap-6 ${verdict.bg}`}>
          <div>
            <div className={`text-base font-semibold ${verdict.color}`}>{verdict.label}</div>
            <div className="text-sm text-gray-500 mt-0.5">{verdict.desc}</div>
          </div>
          <div className="flex gap-6 ml-auto text-center">
            <div><div className="text-2xl font-semibold text-gray-600">{closed}</div><div className="text-xs text-gray-400">Closed</div></div>
            <div><div className="text-2xl font-semibold text-amber-600">{ongoing}</div><div className="text-xs text-gray-400">On-going</div></div>
            <div><div className="text-2xl font-semibold text-red-600">{blocked}</div><div className="text-xs text-gray-400">Blocked</div></div>
            <div><div className="text-2xl font-semibold text-gray-800">{pct}%</div><div className="text-xs text-gray-400">Complete</div></div>
          </div>
        </div>

        {renderAddForm()}

        {listLoading && items.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Loading launch checklist…</p>
        ) : items.length === 0 ? (
          <EmptyState
            title="No launch checklist yet"
            description="Add go/no-go items across product, marketing, logistics, and commerce domains to track launch readiness."
            actionLabel={canEditLaunch && editableDomains.length > 0 ? '+ Add item' : undefined}
            onAction={canEditLaunch && editableDomains.length > 0 ? () => openAdd() : undefined}
          />
        ) : (
          <>
            <p className="text-xs text-gray-400 -mt-2">Click a domain to see its checklist items.</p>
            <div className="grid grid-cols-2 gap-4">
              {ALL_DOMAINS.map(domain => {
                const meta = DOMAIN_META[domain]
                const stats = domainStats(domain)
                return (
                  <button
                    key={domain}
                    type="button"
                    onClick={() => goDomain(domain)}
                    className="card text-left hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-md flex items-center justify-center text-sm"
                          style={{ background: `${meta.color}22`, color: meta.color }}
                        >
                          {meta.icon}
                        </div>
                        <span className="text-sm font-medium text-gray-800">{meta.label}</span>
                      </div>
                      <span className="text-xs text-indigo-500 font-medium">View →</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        {stats.count === 0
                          ? 'No items yet'
                          : `${stats.count} item${stats.count === 1 ? '' : 's'} · ${stats.closed} closed${stats.blocked ? ` · ${stats.blocked} blocked` : ''}`}
                      </div>
                      {stats.count > 0 && (
                        <div className="text-right">
                          <div className="text-xs font-medium text-gray-600">{stats.closed}/{stats.count}</div>
                          <div className="h-1.5 w-20 bg-gray-100 rounded-full mt-1 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${stats.pct}%`, background: meta.color }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}

        <div className="card flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-800">AI launch gate analysis</div>
            <div className="text-xs text-gray-400 mt-0.5">
              Get a Go / Watch / No Go recommendation for the program — separate from item statuses above.
            </div>
          </div>
          <button onClick={analyzeReadiness} disabled={aiLoading || items.length === 0} className="btn-primary disabled:opacity-50">
            {aiLoading ? '⟳ Analyzing…' : '✦ Analyze readiness'}
          </button>
        </div>

        {aiResult && (
          <div className="card border-indigo-200 bg-indigo-50/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 text-sm flex items-center justify-center">✦</div>
              <div className="text-sm font-semibold text-indigo-700">Launch readiness analysis</div>
              <div className="ml-auto flex gap-2">
                <span className={`badge ${aiResult.verdict === 'Go' ? 'badge-go' : aiResult.verdict === 'No Go' ? 'badge-nogo' : 'badge-watch'}`}>
                  {aiResult.verdict} · {aiResult.confidence}% confident
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed pb-4 border-b border-gray-200 mb-4">{aiResult.summary}</p>
            {aiResult.topBlockers?.length > 0 && (
              <div className="mb-4">
                <div className="section-title">Must resolve before launch</div>
                {aiResult.topBlockers.map((b, i) => (
                  <div key={i} className="flex items-start gap-3 bg-white rounded-lg px-3 py-2.5 border-l-2 border-red-400 border border-gray-100 mb-2">
                    <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs flex items-center justify-center shrink-0">{i + 1}</div>
                    <div>
                      <div className="text-sm text-gray-700"><strong>{b.area}:</strong> {b.issue}</div>
                      <div className="text-xs text-red-500 mt-1 font-medium">Resolve by {b.mustResolveBy}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {aiResult.watchItems?.length > 0 && (
              <div className="mb-4">
                <div className="section-title">Watch closely</div>
                {aiResult.watchItems.map((w, i) => (
                  <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100 mb-2">
                    <span className="text-sm font-medium text-gray-800">{w.area}</span>
                    <span className="text-xs text-gray-400 ml-4">{w.risk}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="bg-indigo-50 rounded-lg px-4 py-3">
              <div className="text-xs font-medium text-indigo-600 mb-1">Recommended action this week</div>
              <div className="text-sm text-gray-800">{aiResult.recommendation}</div>
            </div>
          </div>
        )}
      </>
    )
  }

  function renderDomain() {
    if (!selectedDomain) return null
    const meta = DOMAIN_META[selectedDomain]
    const stats = domainStats(selectedDomain)
    const canAddHere = canEditLaunch && canEditLaunchDomain(selectedDomain)

    return (
      <>
        <BackNav label="Back to Launch Readiness" onClick={goOverview} />

        <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
              style={{ background: `${meta.color}22`, color: meta.color }}
            >
              {meta.icon}
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">{meta.label}</h2>
              <p className="text-xs text-gray-400">
                {stats.count} item{stats.count === 1 ? '' : 's'} · {stats.closed} closed · {stats.pct}% complete
              </p>
            </div>
          </div>
          {canAddHere && !showForm && (
            <button type="button" onClick={() => openAdd(selectedDomain)} className="btn-secondary">
              + Add item
            </button>
          )}
        </div>

        {renderAddForm()}

        {domainItems.length === 0 ? (
          <EmptyState
            title="No items in this domain"
            description={`Add launch checklist items for ${meta.label.toLowerCase()}.`}
            actionLabel={canAddHere ? '+ Add item' : undefined}
            onAction={canAddHere ? () => openAdd(selectedDomain) : undefined}
          />
        ) : (
          <>
            <p className="text-xs text-gray-400">Click an item to view details.</p>
            <div className="card divide-y divide-gray-50">
              {domainItems.map(item => {
                const s = LAUNCH_STATUS_CONFIG[item.status]
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => goItem(item)}
                    className="w-full flex items-start gap-3 py-3 px-1 text-left hover:bg-indigo-50/40 rounded transition-colors"
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5 ${s.bg}`}
                      style={{ color: s.dotColor }}
                    >
                      {s.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-800 font-medium">{item.label}</div>
                      {(item.owner || item.note) && (
                        <div className="text-xs text-gray-400 mt-0.5 truncate">
                          {[item.owner, item.note].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>
                    <span className={`${s.cls} shrink-0`}>{s.label}</span>
                    <span className="text-xs text-indigo-500 shrink-0 ml-1">→</span>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </>
    )
  }

  function renderItem() {
    if (!selectedDomain || !selectedItem) {
      return (
        <>
          <BackNav label="Back to Launch Readiness" onClick={goOverview} />
          <p className="text-sm text-gray-400">Item not found.</p>
        </>
      )
    }

    const meta = DOMAIN_META[selectedDomain]
    const s = LAUNCH_STATUS_CONFIG[selectedItem.status]
    const canEdit = canEditItem(selectedItem)

    return (
      <>
        <BackNav label={`Back to ${meta.label}`} onClick={() => goDomain(selectedDomain)} />

        {showForm && canEdit ? (
          renderAddForm()
        ) : (
          <div className="card">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${s.bg}`}
                  style={{ color: s.dotColor }}
                >
                  {s.icon}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-gray-900">{selectedItem.label}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{meta.label}</p>
                </div>
              </div>
              <span className={`${s.cls} shrink-0`}>{s.label}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <DetailField label="Status" value={LAUNCH_STATUS_LABEL[selectedItem.status]} />
              <DetailField label="Owner" value={selectedItem.owner} />
              <DetailField label="Domain" value={meta.label} />
              <div className="col-span-2">
                <DetailField label="Note" value={selectedItem.note} />
              </div>
            </div>

            {canEdit && (
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <EditButton onClick={() => openEdit(selectedItem)} />
                <button
                  type="button"
                  onClick={() => removeItem(selectedItem.id)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium px-1 py-0.5"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        )}
      </>
    )
  }

  const showOverviewAdd = view === 'overview' && canEditLaunch && editableDomains.length > 0 && !showForm

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Launch Readiness</h1>
          <p className="text-sm text-gray-400">
            {activeProgram?.name ?? 'Your program'}
            {activeProgram?.launch_target ? ` · Target launch ${activeProgram.launch_target}` : ''}
          </p>
          {(loadError || saveError) && (
            <p className="text-xs text-red-600 mt-1">{saveError || loadError}</p>
          )}
        </div>
        {showOverviewAdd && (
          <button type="button" onClick={() => openAdd()} className="btn-secondary">+ Add item</button>
        )}
      </div>

      {view === 'overview' && renderOverview()}
      {view === 'domain' && renderDomain()}
      {view === 'item' && renderItem()}
    </div>
  )
}
