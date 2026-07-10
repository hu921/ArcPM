'use client'
// components/AiAnalysisCard.tsx
import { AiRiskResult } from '@/lib/types'

interface Props {
  result: AiRiskResult
  onDraftEscalation?: () => void
}

const severityBadge = (s: string) =>
  s === 'high' ? 'badge badge-critical' : s === 'medium' ? 'badge badge-major' : 'badge badge-minor'

const priorityColor = (p: string) =>
  p === 'P1' ? 'text-red-600' : p === 'P2' ? 'text-amber-600' : 'text-gray-400'

const riskColor = (score: number) =>
  score >= 8 ? 'text-red-600' : score >= 5 ? 'text-amber-600' : 'text-green-600'

const levelBadge = (level: string) => {
  const l = level?.toLowerCase()
  if (l === 'blocker') return 'badge badge-blocker'
  if (l === 'critical') return 'badge badge-critical'
  if (l === 'major') return 'badge badge-major'
  if (l === 'minor') return 'badge badge-minor'
  return 'badge badge-norisk'
}

export default function AiAnalysisCard({ result }: Props) {
  return (
    <div className="card border-indigo-200 bg-indigo-50/30">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-sm">✦</div>
        <div>
          <div className="text-sm font-semibold text-indigo-700">AI risk analysis</div>
          <div className="text-xs text-gray-400">Just now</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={levelBadge(result.riskLevel)}>{result.riskLevel} · {result.riskScore}/10</span>
          {result.escalate && (
            <span className="badge badge-blocker">⚠ Escalate</span>
          )}
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm text-gray-600 leading-relaxed pb-4 border-b border-gray-200 mb-4">
        {result.summary}
      </p>

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-lg p-3 border border-gray-100">
          <div className="text-xs text-gray-400 mb-1">Risk score</div>
          <div className={`text-xl font-semibold ${riskColor(result.riskScore)}`}>
            {result.riskScore}<span className="text-sm text-gray-400">/10</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">{result.riskLevel}</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-100">
          <div className="text-xs text-gray-400 mb-1">Launch slip</div>
          <div className={`text-xl font-semibold ${result.launchImpact > 0 ? 'text-amber-600' : 'text-green-600'}`}>
            {result.launchImpact}<span className="text-sm text-gray-400">d</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">{result.launchImpact > 0 ? 'potential' : 'no slip'}</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-100">
          <div className="text-xs text-gray-400 mb-1">PVT gate</div>
          <div className={`text-xl font-semibold ${result.pvtImpact === 'yes' ? 'text-red-600' : result.pvtImpact === 'maybe' ? 'text-amber-600' : 'text-green-600'}`}>
            {result.pvtImpact === 'yes' ? 'Risk' : result.pvtImpact === 'maybe' ? 'Watch' : 'OK'}
          </div>
          <div className="text-xs text-gray-400 mt-1">readiness</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-100">
          <div className="text-xs text-gray-400 mb-1">Tracks hit</div>
          <div className="text-xl font-semibold text-gray-800">{result.affectedTracks?.length ?? 0}</div>
          <div className="text-xs text-gray-400 mt-1">workstreams</div>
        </div>
      </div>

      {/* Affected tracks */}
      {result.affectedTracks?.length > 0 && (
        <div className="mb-4">
          <div className="section-title">Affected tracks</div>
          <div className="flex flex-col gap-2">
            {result.affectedTracks.map((t, i) => (
              <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100 text-sm">
                <span className="font-medium text-gray-800 w-24 shrink-0">{t.track}</span>
                <span className="text-xs text-gray-400 flex-1 mx-3">{t.reason}</span>
                <span className="text-xs font-medium text-indigo-500 mr-3">{t.nextCP}</span>
                <span className={severityBadge(t.severity)}>{t.severity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contingencies */}
      {result.contingencies?.length > 0 && (
        <div className="mb-4">
          <div className="section-title">Contingency actions</div>
          <div className="flex flex-col gap-2">
            {result.contingencies.map((c, i) => (
              <div key={i} className="flex items-start gap-3 bg-white rounded-lg px-3 py-2.5 border-l-2 border-indigo-400 border border-gray-100">
                <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-700">{c.action}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {c.owner} ·{' '}
                    <span className={`font-medium ${priorityColor(c.priority)}`}>{c.priority}</span>
                    {c.deadline && (
                      <span className="ml-2 bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded text-xs">{c.deadline}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
