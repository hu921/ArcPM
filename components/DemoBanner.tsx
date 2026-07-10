'use client'
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

export default function DemoBanner() {
  if (!DEMO_MODE) return null
  return (
    <div className="bg-indigo-600 text-white text-xs text-center py-1.5 px-4">
      🔍 Demo mode — browsing as <strong>Sara (Program Ops)</strong>. Add your Supabase + Anthropic keys to <code className="bg-indigo-500 px-1 rounded">.env.local</code> to enable real data and AI analysis.
    </div>
  )
}
