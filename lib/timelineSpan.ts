// lib/timelineSpan.ts — shared timeline range for Gantt + track date math

const FALLBACK_START = '2026-02-01'
const FALLBACK_END = '2026-10-31'

export interface TimelineSpan {
  startStr: string
  endStr: string
  startMs: number
  endMs: number
}

export function resolveTimelineSpan(program: {
  timeline_start?: string | null
  timeline_end?: string | null
} | null | undefined): TimelineSpan {
  const startStr = program?.timeline_start?.slice(0, 10) ?? FALLBACK_START
  const endStr = program?.timeline_end?.slice(0, 10) ?? FALLBACK_END
  const startMs = parseDateMs(startStr)
  const endMs = parseDateMs(endStr)

  if (endMs <= startMs) {
    return {
      startStr: FALLBACK_START,
      endStr: FALLBACK_END,
      startMs: parseDateMs(FALLBACK_START),
      endMs: parseDateMs(FALLBACK_END),
    }
  }

  return { startStr, endStr, startMs, endMs }
}

function parseDateMs(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00`).getTime()
}

export function dateToFraction(dateStr: string, span: TimelineSpan): number {
  const t = parseDateMs(dateStr.slice(0, 10))
  const range = span.endMs - span.startMs
  if (range <= 0) return 0
  return Math.min(1, Math.max(0, (t - span.startMs) / range))
}

export function formatSpanLabel(span: TimelineSpan): string {
  const fmt = (s: string) =>
    new Date(`${s}T12:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  return `${fmt(span.startStr)} → ${fmt(span.endStr)}`
}

export function formatDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(`${dateStr.slice(0, 10)}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export interface GanttMonthColumn {
  key: string
  label: string
  startFrac: number
  endFrac: number
}

/** One column per calendar month in the program span (max 24). */
export function buildGanttMonthColumns(span: TimelineSpan): GanttMonthColumn[] {
  const cols: GanttMonthColumn[] = []
  const start = new Date(span.startMs)
  let cur = new Date(start.getFullYear(), start.getMonth(), 1)
  const end = new Date(span.endMs)
  const total = span.endMs - span.startMs

  while (cur.getTime() <= end.getTime() && cols.length < 24) {
    const monthStart = new Date(cur.getFullYear(), cur.getMonth(), 1)
    const monthEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0, 23, 59, 59, 999)
    const startFrac = Math.max(0, (monthStart.getTime() - span.startMs) / total)
    const endFrac = Math.min(1, (monthEnd.getTime() - span.startMs) / total)
    const label = monthStart.toLocaleDateString('en-US', { month: 'short' })
    cols.push({
      key: `${cur.getFullYear()}-${cur.getMonth()}`,
      label,
      startFrac,
      endFrac,
    })
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
  }

  if (cols.length === 0) {
    cols.push({ key: '0', label: '—', startFrac: 0, endFrac: 1 })
  }

  return cols
}

export function todayFraction(span: TimelineSpan): number | null {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const t = today.getTime()
  if (t < span.startMs || t > span.endMs) return null
  return (t - span.startMs) / (span.endMs - span.startMs)
}

export function launchFraction(launchTarget: string | null | undefined, span: TimelineSpan): number | null {
  if (!launchTarget) return null
  const t = parseDateMs(launchTarget.slice(0, 10))
  if (t < span.startMs || t > span.endMs) return null
  return (t - span.startMs) / (span.endMs - span.startMs)
}
