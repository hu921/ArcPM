// lib/types.ts

export type RiskLevel = 'blocker' | 'critical' | 'major' | 'minor' | 'no-risk'
export type TrackStatus = 'on-track' | 'at-risk' | 'critical' | 'blocker' | 'complete'
export type LaunchStatus = 'ongoing' | 'blocked' | 'closed'
export type InputMode = 'text' | 'report' | 'item'

// ─── User & Auth ────────────────────────────────────────────────────────────

export type UserRole = 'program_ops' | 'npi' | 'hw_quality' | 'marketing' | 'product'
export type ProgramTemplate = 'hardware' | 'empty'
export type MemberStatus = 'active' | 'removed'

export const ROLE_META: Record<UserRole, {
  label: string
  color: string
  tracks: string[]
  views: string[]
  canEditLaunch: boolean
  canEditRisks: boolean
}> = {
  program_ops: {
    label: 'Program Ops',
    color: '#7F77DD',
    tracks: ['*'],
    views: ['*'],
    canEditLaunch: true,
    canEditRisks: true,
  },
  npi: {
    label: 'NPI',
    color: '#378ADD',
    tracks: ['Hardware', 'Validation', 'Regulatory'],
    views: ['overview', 'timeline', 'risks', 'cert', 'changelog'],
    canEditLaunch: false,
    canEditRisks: true,
  },
  hw_quality: {
    label: 'HW Quality',
    color: '#E24B4A',
    tracks: ['Hardware', 'Validation'],
    views: ['overview', 'risks', 'changelog'],
    canEditLaunch: false,
    canEditRisks: true,
  },
  marketing: {
    label: 'Marketing',
    color: '#1D9E75',
    tracks: ['GTM', 'Packaging'],
    views: ['overview', 'launch', 'changelog'],
    canEditLaunch: true,
    canEditRisks: false,
  },
  product: {
    label: 'Product',
    color: '#BA7517',
    tracks: ['App', 'Algorithm'],
    views: ['overview', 'timeline', 'launch', 'changelog'],
    canEditLaunch: true,
    canEditRisks: false,
  },
}

export interface UserProfile {
  id: string
  email: string
  full_name: string
  account_setup_complete: boolean
  last_active_program_id: string | null
  created_at: string
  /** @deprecated Legacy field — use active program membership role */
  role?: UserRole
}

export interface ProgramMember {
  id: string
  program_id: string
  user_id: string
  role: UserRole
  status: MemberStatus
  invited_by: string | null
  joined_at: string
}

export interface ProgramInvite {
  id: string
  program_id: string
  email: string
  role: UserRole
  invited_by: string
  token: string
  expires_at: string
  accepted_at: string | null
  revoked_at: string | null
  created_at: string
  programs?: Pick<Program, 'id' | 'name'>
  inviter?: Pick<UserProfile, 'full_name'>
}

// ─── Program ────────────────────────────────────────────────────────────────

export interface Program {
  id: string
  name: string
  version: string
  launch_target: string | null
  timeline_start: string | null
  timeline_end: string | null
  reporter: string | null
  status: 'active' | 'archived'
  created_by: string | null
  template: ProgramTemplate
  created_at: string
}

export interface ProgramComponent {
  id: string
  program_id: string
  name: string
  color: string
  sort_order: number
  created_by: string | null
  created_at: string
}

export interface ProgramWithMembership extends Program {
  memberRole: UserRole
}

export interface ProgramTeamMember {
  membershipId: string
  userId: string
  role: UserRole
  fullName: string
  email: string
  joinedAt: string
}

// ─── Tracks ─────────────────────────────────────────────────────────────────

export interface Track {
  id: string
  program_id: string
  name: string
  color: string
  status: TrackStatus
  owner_role: UserRole
  start_date: string
  end_date: string
}

// ─── Risk Items ─────────────────────────────────────────────────────────────

export interface RiskItem {
  id: string
  program_id: string
  track: string
  area: string
  status_note: string
  mitigation: string
  level: RiskLevel
  next_cp: string
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}

// ─── Launch Items ───────────────────────────────────────────────────────────

export interface LaunchItem {
  id: string
  program_id: string
  domain: string
  label: string
  status: LaunchStatus
  owner: string
  note: string
  updated_by: string
  updated_at: string
}

// ─── Certification Items ────────────────────────────────────────────────────

export interface CertItem {
  id: string
  program_id: string
  name: string
  level: RiskLevel
  status: string
  target: string | null
  owner: string | null
  region: string
  note: string | null
  updated_by: string | null
  updated_at: string
}

// ─── Change Log ─────────────────────────────────────────────────────────────

export interface ChangeLogEntry {
  id: string
  program_id: string
  created_by: string
  input_text: string
  input_mode: InputMode
  ai_result: Record<string, unknown> | null
  risk_score: number | null
  risk_level: RiskLevel | null
  launch_impact_days: number | null
  created_at: string
  created_by_name?: string
  created_by_role?: UserRole | null
}

// ─── AI Analysis ────────────────────────────────────────────────────────────

export interface AIAnalysisResult {
  risk_score: number
  risk_level: RiskLevel
  launch_impact_days: number
  affected_tracks: string[]
  contingency_actions: {
    action: string
    owner: string
    deadline: string
  }[]
  escalate: boolean
  summary: string
}

export interface LaunchAnalysisResult {
  verdict: 'go' | 'watch' | 'nogo'
  confidence: number
  blockers: string[]
  watch_items: string[]
  recommended_action: string
}

// ─── AI response shapes (API / UI) ───────────────────────────────────────────

export interface AiRiskResult {
  riskScore: number
  riskLevel: string
  launchImpact: number
  pvtImpact: 'yes' | 'no' | 'maybe'
  affectedTracks: { track: string; severity: string; reason: string; nextCP: string }[]
  contingencies: { action: string; owner: string; priority: string; deadline: string }[]
  escalate: boolean
  summary: string
}

export interface AiLaunchResult {
  verdict: string
  confidence: number
  topBlockers: { area: string; issue: string; mustResolveBy: string }[]
  watchItems: { area: string; risk: string }[]
  summary: string
  recommendation: string
}

export type LaunchDomain = 'product' | 'marketing' | 'logistics' | 'commerce'

// ─── Local storage item shapes (demo / client persistence) ───────────────────

export interface LocalTimelineTrack {
  id: string
  name: string
  color: string
  startDate: string
  endDate: string
  area: string
  status?: TrackStatus
  dri?: string
  driId?: string
  start: number
  end: number
}

export interface LocalRiskItem {
  id: string
  track: string
  area: string
  statusNote: string
  mitigation: string
  level: RiskLevel
  nextCp: string
}

export interface LocalLaunchItem {
  id: string
  domain: LaunchDomain
  label: string
  owner: string
  note: string
  status: LaunchStatus
}

export interface LocalCertItem {
  id: string
  name: string
  level: RiskLevel
  status: string
  target: string
  owner: string
  region: string
  note: string
}

// ─── Demo / seed data ───────────────────────────────────────────────────────

export const DEMO_RISKS: Omit<RiskItem, 'id' | 'program_id' | 'created_by' | 'updated_by' | 'created_at' | 'updated_at'>[] = [
  { track: 'Hardware', area: 'PCM MOSFET clearance', status_note: 'Size-7 units failing CT scan', mitigation: 'DOE planned next week', level: 'critical', next_cp: '2026-06-15' },
  { track: 'Regulatory', area: 'BLE range certification', status_note: 'Pre-scan submitted', mitigation: 'Awaiting lab feedback', level: 'major', next_cp: '2026-07-01' },
]

export const DEMO_LAUNCH_ITEMS: Omit<LaunchItem, 'id' | 'program_id' | 'updated_by' | 'updated_at'>[] = [
  { domain: 'product', label: 'Core features complete', status: 'ongoing', owner: 'Alex', note: 'Algorithm v0.9 in review' },
  { domain: 'marketing', label: 'Launch campaign assets', status: 'closed', owner: 'Maria', note: '' },
  { domain: 'logistics', label: 'Packaging supplier confirmed', status: 'ongoing', owner: 'Maria', note: 'MOQ negotiation ongoing' },
  { domain: 'commerce', label: 'Shopify store ready', status: 'blocked', owner: 'Maria', note: 'Payment gateway pending' },
]
