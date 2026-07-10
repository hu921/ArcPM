'use client'
// components/GanttChart.tsx

import {
  buildGanttMonthColumns,
  launchFraction,
  resolveTimelineSpan,
  todayFraction,
  type TimelineSpan,
} from '@/lib/timelineSpan'

interface TrackBar {
  name: string
  color: string
  start: number
  end: number
  changed?: boolean
  delayed?: boolean
  complete?: boolean
}

interface Props {
  tracks?: TrackBar[]
  spanStart?: string | null
  spanEnd?: string | null
  launchTarget?: string | null
}

const DEFAULT_TRACKS: TrackBar[] = []

function MarkerLine({ pos, color, title }: { pos: number; color: string; title: string }) {
  return (
    <div
      className="absolute top-0 bottom-0 w-px z-10"
      style={{ left: `${pos * 100}%`, background: color, opacity: 0.7 }}
      title={title}
    />
  )
}

export default function GanttChart({
  tracks = DEFAULT_TRACKS,
  spanStart,
  spanEnd,
  launchTarget,
}: Props) {
  const span: TimelineSpan = resolveTimelineSpan({ timeline_start: spanStart, timeline_end: spanEnd })
  const months = buildGanttMonthColumns(span)
  const cols = months.length
  const todayPos = todayFraction(span)
  const launchPos = launchFraction(launchTarget, span)

  const todayLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="overflow-x-auto">
      <div className="grid mb-1" style={{ gridTemplateColumns: `100px repeat(${cols}, 1fr)` }}>
        <div />
        {months.map(m => (
          <div key={m.key} className="text-center text-xs text-gray-400 py-1 truncate px-0.5">
            {m.label}
          </div>
        ))}
      </div>

      {tracks.map(track => (
        <div
          key={track.name}
          className="grid items-center h-6 mb-1"
          style={{ gridTemplateColumns: `100px repeat(${cols}, 1fr)` }}
        >
          <div className="text-xs text-gray-500 truncate pr-2">{track.name}</div>
          {months.map((month, col) => {
            const colStart = month.startFrac
            const colEnd = month.endFrac
            const colWidth = colEnd - colStart
            const hasBar = track.end > colStart && track.start < colEnd
            const todayInCol = todayPos !== null && todayPos >= colStart && todayPos < colEnd
            const launchInCol = launchPos !== null && launchPos >= colStart && launchPos < colEnd
            const todayPct = todayInCol && colWidth > 0 ? ((todayPos! - colStart) / colWidth) * 100 : 0
            const launchPct = launchInCol && colWidth > 0 ? ((launchPos! - colStart) / colWidth) * 100 : 0

            const barLeft = colWidth > 0
              ? Math.max(0, (Math.max(track.start, colStart) - colStart) / colWidth * 100)
              : 0
            const barWidth = colWidth > 0 && Math.max(track.start, colStart) < Math.min(track.end, colEnd)
              ? (Math.min(track.end, colEnd) - Math.max(track.start, colStart)) / colWidth * 100
              : 0

            return (
              <div key={month.key} className="relative h-full border-l border-gray-100">
                {todayInCol && <MarkerLine pos={todayPct / 100} color="#818cf8" title={`Today (${todayLabel})`} />}
                {launchInCol && <MarkerLine pos={launchPct / 100} color="#1D9E75" title="Launch target" />}
                {hasBar && barWidth > 0 && (
                  <div
                    className={`absolute top-1 h-3.5 rounded-sm ${
                      track.complete ? 'opacity-35'
                      : track.changed ? 'opacity-50'
                      : 'opacity-75'
                    }`}
                    style={{
                      left: `${barLeft}%`,
                      width: `${barWidth}%`,
                      background: track.complete ? '#9CA3AF' : track.color,
                      outline: track.complete
                        ? '1.5px solid #D1D5DB'
                        : track.delayed
                          ? '2px solid #E24B4A'
                          : track.changed
                            ? `1.5px dashed ${track.color}`
                            : 'none',
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      ))}

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 flex-wrap">
        {todayPos !== null && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <div className="w-4 h-px bg-indigo-400 opacity-60" />
            Today ({todayLabel})
          </div>
        )}
        {launchPos !== null && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <div className="w-4 h-px bg-emerald-500 opacity-70" />
            Launch target
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-amber-500">
          <div className="w-4 h-0 border-t-2 border-dashed border-amber-400" />
          Date changed
        </div>
        <div className="flex items-center gap-1.5 text-xs text-red-600">
          <div className="w-4 h-3 rounded-sm border-2 border-red-500 opacity-80" />
          Delayed
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <div className="w-4 h-3 rounded-sm bg-gray-300 opacity-60" />
          Complete
        </div>
      </div>
    </div>
  )
}
