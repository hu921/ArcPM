'use client'
// app/page.tsx  (Overview)
import { useMemo, useState } from 'react'
import Link from 'next/link'
import GanttChart from '@/components/GanttChart'
import AiAnalysisCard from '@/components/AiAnalysisCard'
import EmptyState from '@/components/EmptyState'
import { useAuth } from '@/lib/AuthContext'
import { useProgramRisks } from '@/lib/useProgramRisks'
import { useProgramTracks } from '@/lib/useProgramTracks'
import { dateToFraction, formatDisplayDate, formatSpanLabel, resolveTimelineSpan } from '@/lib/timelineSpan'
import { isTrackDelayed } from '@/lib/trackUtils'
import { AiRiskResult, RiskLevel } from '@/lib/types'

const EXAMPLES: string[] = []

const levelClass: Record<string, string> = {
  blocker:  'badge badge-blocker',
  critical: 'badge badge-critical',
  major:    'badge badge-major',
  minor:    'badge badge-minor',
  'no-risk':'badge badge-norisk',
}

const LEVEL_ORDER: RiskLevel[] = ['blocker', 'critical', 'major', 'minor', 'no-risk']

type Tab = 'text' | 'report' | 'item'

export default function OverviewPage() {
  const { activeProgram } = useAuth()
  const { tracks, loading: loadingTracks } = useProgramTracks(activeProgram?.id)
  const { items: riskItems, loading: loadingRisks } = useProgramRisks(activeProgram?.id)

  const span = useMemo(
    () => resolveTimelineSpan(activeProgram),
    [activeProgram?.timeline_start, activeProgram?.timeline_end],
  )

  const ganttTracks = useMemo(() => tracks.map(t => ({
    name: t.name,
    color: t.color,
    start: Math.min(dateToFraction(t.startDate, span), dateToFraction(t.endDate, span)),
    end: Math.max(dateToFraction(t.startDate, span), dateToFraction(t.endDate, span)),
    delayed: isTrackDelayed(t),
    complete: t.status === 'complete',
  })), [tracks, span])

  const sortedRisks = useMemo(() => {
    return [...riskItems].sort(
      (a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level),
    )
  }, [riskItems])

  const [tab, setTab] = useState<Tab>('text')
  const [textInput, setTextInput] = useState('')
  const [reportInput, setReportInput] = useState('')
  const [itemTrack, setItemTrack] = useState('')
  const [itemRisk, setItemRisk] = useState('')
  const [itemDesc, setItemDesc] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AiRiskResult | null>(null)
  const [analyzeError, setAnalyzeError] = useState('')

  function getInput(): string {
    if (tab === 'text') return textInput.trim()
    if (tab === 'report') return reportInput.trim()
    if (tab === 'item') return itemTrack && itemDesc ? `Track: ${itemTrack}. Risk: ${itemRisk}. Update: ${itemDesc}` : ''
    return ''
  }

  async function analyze() {
    const input = getInput()
    if (!input) return
    setLoading(true)
    setResult(null)
    setAnalyzeError('')
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, mode: tab }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setAnalyzeError(data.error ?? 'Analysis failed. Check GEMINI_API_KEY or ANTHROPIC_API_KEY in .env.local.')
        return
      }
      if (typeof data.riskScore !== 'number' || !data.summary) {
        setAnalyzeError('AI returned an unexpected format. Try again.')
        return
      }
      setResult(data)
    } catch {
      setAnalyzeError('Could not reach the analysis API. Is npm run dev running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Program Overview</h1>
          <p className="text-sm text-gray-400">
            {activeProgram?.name ?? 'Your program'} · Timeline and risks sync from their pages
          </p>
        </div>
        <div className="flex gap-2">
          <span className="badge badge-blocker">{riskItems.filter(r => r.level === 'blocker').length} Blocker</span>
          <span className="badge badge-critical">{riskItems.filter(r => r.level === 'critical').length} Critical</span>
          <span className="badge badge-major">{riskItems.filter(r => r.level === 'major').length} Major</span>
        </div>
      </div>

      <div>
        <div className="section-title">Log a change</div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          {(['text', 'report', 'item'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                tab === t
                  ? 'bg-indigo-50 text-indigo-600 border-indigo-300'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-200'
              }`}
            >
              {t === 'text' ? '💬 Free text' : t === 'report' ? '📋 Paste report' : '☑ By risk item'}
            </button>
          ))}
        </div>

        <div className="card">
          {tab === 'text' && (
            <>
              <textarea
                className="input-base resize-none"
                rows={3}
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder="Describe a change — e.g. 'CT scan confirms PCM MOSFET damage on size-7 units. DOE planned next week.'"
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {EXAMPLES.map((ex, i) => (
                  <button key={i} onClick={() => setTextInput(ex)} className="btn-secondary">
                    {['🔧 FATP update', '🌡 Thermal result', '📡 Cert delay', '🔋 Battery gauge'][i]}
                  </button>
                ))}
              </div>
            </>
          )}

          {tab === 'report' && (
            <>
              <p className="text-xs text-gray-400 mb-2">Paste a build status update, email, or meeting notes. AI extracts and maps every risk item.</p>
              <textarea
                className="input-base resize-none"
                rows={5}
                value={reportInput}
                onChange={e => setReportInput(e.target.value)}
                placeholder="Paste a weekly build status update, email, or Slack summary here…"
              />
            </>
          )}

          {tab === 'item' && (
            <>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <select className="input-base" value={itemTrack} onChange={e => setItemTrack(e.target.value)}>
                  <option value="">Select track…</option>
                  {tracks.map(t => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                  {riskItems.map(r => r.track).filter((t, i, arr) => t && arr.indexOf(t) === i).map(t => (
                    <option key={`risk-${t}`} value={t}>{t}</option>
                  ))}
                </select>
                <select className="input-base" value={itemRisk} onChange={e => setItemRisk(e.target.value)}>
                  <option value="">Risk level…</option>
                  {['Blocker', 'Critical', 'Major', 'Minor', 'No Risk'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <textarea
                className="input-base resize-none"
                rows={3}
                value={itemDesc}
                onChange={e => setItemDesc(e.target.value)}
                placeholder="What changed? New finding, test result, or blocker…"
              />
            </>
          )}

          <button
            onClick={analyze}
            disabled={loading || !getInput()}
            className="btn-primary mt-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '⟳ Analyzing…' : '✦ Analyze risk'}
          </button>

          {analyzeError && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-3">
              {analyzeError}
            </div>
          )}
        </div>
      </div>

      {result && !analyzeError && <AiAnalysisCard result={result} />}

      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="section-title mb-0">
            Program timeline — {formatSpanLabel(span)}
            {activeProgram?.launch_target
              ? ` · Launch ${formatDisplayDate(activeProgram.launch_target)}`
              : ''}
          </div>
          {tracks.length > 0 && (
            <Link href="/timeline" className="text-xs text-indigo-600 hover:underline shrink-0">
              Open timeline
            </Link>
          )}
        </div>
        <div className="card">
          {loadingTracks ? (
            <p className="text-sm text-gray-400 py-8 text-center">Loading timeline…</p>
          ) : tracks.length === 0 ? (
            <EmptyState
              title="No timeline tracks yet"
              description="Add tracks on the Timeline page — they will appear here on Overview."
              actionLabel="Go to Timeline"
              actionHref="/timeline"
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
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="section-title mb-0">Risk register snapshot</div>
          {riskItems.length > 0 && (
            <Link href="/risks" className="text-xs text-indigo-600 hover:underline shrink-0">
              Open risk register
            </Link>
          )}
        </div>
        {loadingRisks ? (
          <p className="text-sm text-gray-400 py-8 text-center">Loading risks…</p>
        ) : riskItems.length === 0 ? (
          <EmptyState
            title="No risks logged yet"
            description="Add items on the Risk register page — they will appear here on Overview."
            actionLabel="Go to Risk register"
            actionHref="/risks"
          />
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-2.5 w-16">Track</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-2.5 w-36">Component</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-2.5">Status</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-2.5 w-14">CP</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-2.5 w-20">Level</th>
                </tr>
              </thead>
              <tbody>
                {sortedRisks.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800 text-xs">{r.track}</td>
                    <td className="px-4 py-2.5 text-gray-600 text-xs">{r.area}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs max-w-xs truncate">{r.statusNote || '—'}</td>
                    <td className="px-4 py-2.5 text-xs font-medium text-indigo-500">
                      {r.nextCp ? r.nextCp.slice(5) : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={levelClass[r.level]}>
                        {r.level.charAt(0).toUpperCase() + r.level.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
