'use client'
import { useState } from 'react'
import { AiRiskResult } from '@/lib/types'
import AiAnalysisCard from '@/components/AiAnalysisCard'
import { useAuth } from '@/lib/AuthContext'

const ROLE_META: Record<string, { label: string; color: string }> = {
  program_ops: { label: 'Program Ops', color: '#7F77DD' },
  npi:         { label: 'NPI',         color: '#378ADD' },
  hw_quality:  { label: 'HW Quality',  color: '#E24B4A' },
  marketing:   { label: 'Marketing',   color: '#1D9E75' },
  product:     { label: 'Product',     color: '#BA7517' },
}

const SEED_ENTRIES: {
  id: string; created_at: string; created_by_name: string; created_by_role: string
  input_text: string; input_mode: string; ai_result?: AiRiskResult
}[] = []

type FilterLevel = 'all' | 'blocker' | 'critical' | 'major' | 'minor'

export default function ChangelogPage() {
  const { activeProgram } = useAuth()
  const [entries] = useState(SEED_ENTRIES)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterLevel, setFilterLevel] = useState<FilterLevel>('all')
  const [filterRole, setFilterRole] = useState<string>('all')

  const visible = entries.filter(e => {
    const levelMatch = filterLevel === 'all' || e.ai_result?.riskLevel?.toLowerCase() === filterLevel
    const roleMatch  = filterRole  === 'all' || e.created_by_role === filterRole
    return levelMatch && roleMatch
  })

  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Change Log</h1>
        <p className="text-sm text-gray-400">{activeProgram?.name ?? 'SR1 v1'} · All AI analyses run by the team</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex gap-1.5">
          {(['all', 'blocker', 'critical', 'major', 'minor'] as FilterLevel[]).map(l => (
            <button key={l} onClick={() => setFilterLevel(l)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${filterLevel === l ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'}`}>
              {l.charAt(0).toUpperCase() + l.slice(1)}
            </button>
          ))}
        </div>
        <select
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-300"
          value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="all">All roles</option>
          {Object.entries(ROLE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{visible.length} entr{visible.length === 1 ? 'y' : 'ies'}</span>
      </div>

      {/* Feed */}
      <div className="flex flex-col gap-4">
        {entries.length === 0 && (
          <div className="card text-center py-12 text-gray-400 text-sm">
            No change log entries yet. Log a change on Overview and click <strong>Analyze risk</strong>.
          </div>
        )}
        {visible.length === 0 && entries.length > 0 && (
          <div className="card text-center py-12 text-gray-400 text-sm">No entries match the current filter.</div>
        )}
        {visible.map(entry => {
          const role = ROLE_META[entry.created_by_role ?? ''] ?? { label: entry.created_by_role, color: '#888' }
          const isExpanded = expandedId === entry.id
          const sc = entry.ai_result?.riskScore ?? 0
          const scColor = sc >= 8 ? 'text-red-600' : sc >= 5 ? 'text-amber-600' : 'text-green-600'
          const levelCls = entry.ai_result?.riskLevel?.toLowerCase() === 'blocker' ? 'badge badge-blocker'
            : entry.ai_result?.riskLevel?.toLowerCase() === 'critical' ? 'badge badge-critical'
            : entry.ai_result?.riskLevel?.toLowerCase() === 'major' ? 'badge badge-major' : 'badge badge-minor'

          return (
            <div key={entry.id} className="card border border-gray-100">
              {/* Header row */}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: role.color }}>
                  {entry.created_by_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-800">{entry.created_by_name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{ background: role.color }}>{role.label}</span>
                    <span className="text-xs text-gray-400">{new Date(entry.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">{entry.input_text}</p>
                </div>
              </div>

              {/* Score row */}
              {entry.ai_result && (
                <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                  <span className={levelCls}>{entry.ai_result.riskLevel}</span>
                  <span className={`text-sm font-semibold ${scColor}`}>{entry.ai_result.riskScore}/10</span>
                  <span className="text-xs text-gray-400">{entry.ai_result.launchImpact}d launch impact</span>
                  {entry.ai_result.escalate && <span className="badge badge-blocker">⚠ Escalate</span>}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    className="ml-auto btn-secondary">
                    {isExpanded ? 'Hide analysis ↑' : 'View analysis ↓'}
                  </button>
                </div>
              )}

              {/* Expanded AI card */}
              {isExpanded && entry.ai_result && (
                <div className="mt-4">
                  <AiAnalysisCard result={entry.ai_result} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-gray-400 text-center">Showing {visible.length} of {entries.length} entries · New entries appear automatically when the team runs AI analysis</p>
    </div>
  )
}
