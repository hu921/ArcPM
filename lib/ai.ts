// lib/ai.ts — AI analysis (Gemini preferred, Anthropic fallback)
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? '',
})

export const RISK_ANALYSIS_SYSTEM = `You are an AI program management co-pilot for software and hardware product development.
Adapt track names to the program context (e.g. Frontend, Backend, Auth, Infrastructure for web apps; Hardware, Firmware, GTM for hardware).

When a PM reports a change or new information, respond ONLY with a JSON object (no markdown, no preamble) in exactly this structure:
{
  "riskScore": <1-10 integer>,
  "riskLevel": "Blocker|Critical|Major|Minor|No Risk",
  "launchImpact": <integer days>,
  "pvtImpact": "yes|no|maybe",
  "affectedTracks": [
    {"track": "<name>", "severity": "low|medium|high", "reason": "<1 sentence>", "nextCP": "<date or TBD>"}
  ],
  "contingencies": [
    {"action": "<specific action>", "owner": "<role>", "priority": "P1|P2|P3", "deadline": "<date or timeframe>"}
  ],
  "escalate": true|false,
  "summary": "<2-3 sentence PM-ready summary>"
}`

export const LAUNCH_READINESS_SYSTEM = `You are an AI program management co-pilot reviewing launch readiness for software and hardware products.

Checklist items use operational statuses: Closed (done), On-going (in progress), Blocked (stuck).
Your job is to recommend a program-level launch GATE decision — not to relabel each item.

Respond ONLY with a JSON object (no markdown, no preamble) in exactly this structure:
{
  "verdict": "Go|Watch|No Go",
  "confidence": <0-100 integer>,
  "topBlockers": [
    {"area": "<domain/area>", "issue": "<1 sentence>", "mustResolveBy": "<date>"}
  ],
  "watchItems": [
    {"area": "<domain/area>", "risk": "<1 sentence>"}
  ],
  "summary": "<2-3 PM-ready sentences>",
  "recommendation": "<1 clear action for the PM this week>"
}`

function parseAiJson<T>(raw: string): T {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  return JSON.parse(cleaned) as T
}

function normalizeRiskResult(raw: Record<string, unknown>) {
  return {
    riskScore: Number(raw.riskScore ?? raw.risk_score ?? 0),
    riskLevel: String(raw.riskLevel ?? raw.risk_level ?? 'Unknown'),
    launchImpact: Number(raw.launchImpact ?? raw.launch_impact ?? 0),
    pvtImpact: (raw.pvtImpact ?? raw.pvt_impact ?? 'no') as 'yes' | 'no' | 'maybe',
    affectedTracks: (raw.affectedTracks ?? raw.affected_tracks ?? []) as {
      track: string; severity: string; reason: string; nextCP: string
    }[],
    contingencies: (raw.contingencies ?? []) as {
      action: string; owner: string; priority: string; deadline: string
    }[],
    escalate: Boolean(raw.escalate),
    summary: String(raw.summary ?? ''),
  }
}

function isConfiguredKey(value: string | undefined, placeholder: string) {
  return !!value && value.trim().length > 0 && !value.includes(placeholder)
}

function resolveProvider(): 'gemini' | 'anthropic' {
  if (isConfiguredKey(process.env.GEMINI_API_KEY, 'your_')) return 'gemini'
  if (isConfiguredKey(process.env.ANTHROPIC_API_KEY, 'placeholder')) return 'anthropic'
  throw new Error(
    'No AI API key configured. Add GEMINI_API_KEY or ANTHROPIC_API_KEY to .env.local and restart npm run dev.',
  )
}

function formatGeminiError(body: string, status: number): string {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string; status?: string; code?: number } }
    const msg = parsed.error?.message ?? ''
    if (status === 429 || parsed.error?.status === 'RESOURCE_EXHAUSTED') {
      return 'Gemini free-tier quota exceeded. Wait a minute and retry, set GEMINI_MODEL=gemini-2.0-flash-lite in .env.local, or enable billing at aistudio.google.com.'
    }
    if (msg) return msg.length > 280 ? msg.slice(0, 280) + '…' : msg
  } catch {
    // not JSON
  }
  return body.length > 280 ? body.slice(0, 280) + '…' : body || `Gemini API error (${status})`
}

const GEMINI_MODEL_FALLBACKS = [
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-2.0-flash',
]

async function callGeminiOnce(model: string, system: string, user: string, key: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.4,
        },
      }),
    },
  )

  const body = await res.text()
  if (!res.ok) {
    return { ok: false as const, status: res.status, body }
  }

  const data = JSON.parse(body)
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined
  if (!text?.trim()) {
    return { ok: false as const, status: 502, body: 'Gemini returned an empty response' }
  }
  return { ok: true as const, text }
}

async function callGemini(system: string, user: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY!
  const models = process.env.GEMINI_MODEL
    ? [process.env.GEMINI_MODEL, ...GEMINI_MODEL_FALLBACKS.filter(m => m !== process.env.GEMINI_MODEL)]
    : GEMINI_MODEL_FALLBACKS

  let lastError = 'Gemini API request failed'

  for (const model of models) {
    const result = await callGeminiOnce(model, system, user, key)
    if (result.ok) return result.text

    lastError = formatGeminiError(result.body, result.status)
    // Try next model on quota / model-not-found errors
    if (result.status !== 429 && result.status !== 404) {
      throw new Error(lastError)
    }
  }

  throw new Error(lastError)
}

async function callAnthropic(system: string, user: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system,
    messages: [{ role: 'user', content: user }],
  })

  const raw = message.content.find(b => b.type === 'text')?.text ?? ''
  if (!raw.trim()) throw new Error('Claude returned an empty response')
  return raw
}

async function callAi(system: string, user: string): Promise<string> {
  return resolveProvider() === 'gemini'
    ? callGemini(system, user)
    : callAnthropic(system, user)
}

export async function analyzeRisk(input: string, programContext: string) {
  const system = RISK_ANALYSIS_SYSTEM + (programContext ? `\n\nProgram context:\n${programContext}` : '')
  const raw = await callAi(system, `Update from PM: ${input}`)
  return normalizeRiskResult(parseAiJson<Record<string, unknown>>(raw))
}

export async function analyzeLaunchReadiness(
  domainSummary: string,
  score: { closed: number; ongoing: number; blocked: number; total: number },
) {
  const user = `Launch checklist item statuses (operational readiness):
Overall: ${score.closed} Closed, ${score.ongoing} On-going, ${score.blocked} Blocked out of ${score.total} items.

Provide a launch GATE verdict (Go / Watch / No Go) as a program-level decision, separate from item statuses.

${domainSummary}`
  const raw = await callAi(LAUNCH_READINESS_SYSTEM, user)
  return parseAiJson<Record<string, unknown>>(raw)
}
