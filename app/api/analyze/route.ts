// app/api/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { analyzeRisk } from '@/lib/ai'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { input, mode, programId, programContext, userId } = await req.json()

    if (!input?.trim()) {
      return NextResponse.json({ error: 'No input provided' }, { status: 400 })
    }

    const result = await analyzeRisk(input, programContext ?? '')

    // Persist to change log with user attribution
    if (programId) {
      await supabase.from('change_log').insert({
        program_id: programId,
        created_by: userId ?? null,
        input_text: input,
        input_mode: mode ?? 'text',
        ai_result: result,
        risk_score: result.riskScore,
        risk_level: result.riskLevel,
        launch_impact_days: result.launchImpact,
      })
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('analyze error:', err)
    const message = err instanceof Error ? err.message : 'Analysis failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
