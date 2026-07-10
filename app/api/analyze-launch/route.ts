// app/api/analyze-launch/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { analyzeLaunchReadiness } from '@/lib/ai'
import { normalizeLaunchStatus } from '@/lib/launchUtils'
import { LaunchItem } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const { items }: { items: LaunchItem[] } = await req.json()

    if (!items?.length) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 })
    }

    const normalized = items.map(i => ({ ...i, status: normalizeLaunchStatus(i.status) }))
    const closed = normalized.filter(i => i.status === 'closed').length
    const ongoing = normalized.filter(i => i.status === 'ongoing').length
    const blocked = normalized.filter(i => i.status === 'blocked').length

    const domains = ['product', 'marketing', 'logistics', 'commerce'] as const
    const domainSummary = domains.map(domain => {
      const domainItems = normalized.filter(i => i.domain === domain)
      const lines = domainItems.map(i => {
        const label = i.status === 'closed' ? 'Closed' : i.status === 'blocked' ? 'Blocked' : 'On-going'
        return `${i.label}: ${label}${i.note ? ` (${i.note})` : ''}`
      }).join('; ')
      return `${domain.charAt(0).toUpperCase() + domain.slice(1)}: ${lines}`
    }).join('\n')

    const result = await analyzeLaunchReadiness(domainSummary, {
      closed,
      ongoing,
      blocked,
      total: items.length,
    })
    return NextResponse.json(result)
  } catch (err) {
    console.error('analyze-launch error:', err)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
