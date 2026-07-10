'use client'
import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react'
import { User } from '@supabase/supabase-js'
import { OnboardingStep, resolveOnboardingStep } from './onboarding'
import { Program, ProgramInvite, ProgramMember, ProgramWithMembership, UserProfile, UserRole } from './types'

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

const DEMO_USER: UserProfile = {
  id: 'demo',
  email: 'sara@signal.pm',
  full_name: 'Sara',
  account_setup_complete: true,
  last_active_program_id: 'p1',
  created_at: new Date().toISOString(),
  role: 'program_ops',
}

const DEMO_MEMBERSHIP: ProgramMember = {
  id: 'demo-m',
  program_id: 'p1',
  user_id: 'demo',
  role: 'program_ops',
  status: 'active',
  invited_by: null,
  joined_at: new Date().toISOString(),
}

const DEMO_PROGRAMS: ProgramWithMembership[] = [
  { id: 'p1', name: 'Sample Program v1', version: 'v1', launch_target: '2026-10-15', timeline_start: '2026-02-01', timeline_end: '2026-10-31', reporter: null, status: 'active', created_by: 'demo', template: 'hardware', created_at: '', memberRole: 'program_ops' },
  { id: 'p2', name: 'Sample Program v1.5', version: 'v1.5', launch_target: null, timeline_start: null, timeline_end: null, reporter: null, status: 'archived', created_by: 'demo', template: 'hardware', created_at: '', memberRole: 'program_ops' },
  { id: 'p3', name: 'Sample Program v2', version: 'v2', launch_target: null, timeline_start: null, timeline_end: null, reporter: null, status: 'archived', created_by: 'demo', template: 'hardware', created_at: '', memberRole: 'program_ops' },
]

interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  memberships: ProgramMember[]
  activeMembership: ProgramMember | null
  activeRole: UserRole | null
  programs: ProgramWithMembership[]
  activeProgram: ProgramWithMembership | null
  setActiveProgram: (p: Program) => void
  pendingInvite: ProgramInvite | null
  onboardingStep: OnboardingStep | null
  needsOnboarding: boolean
  loading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  memberships: [],
  activeMembership: null,
  activeRole: null,
  programs: [],
  activeProgram: null,
  setActiveProgram: () => {},
  pendingInvite: null,
  onboardingStep: null,
  needsOnboarding: false,
  loading: false,
  refreshProfile: async () => {},
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(DEMO_MODE ? DEMO_USER : null)
  const [memberships, setMemberships] = useState<ProgramMember[]>(DEMO_MODE ? [DEMO_MEMBERSHIP] : [])
  const [programs, setPrograms] = useState<ProgramWithMembership[]>(DEMO_MODE ? DEMO_PROGRAMS : [])
  const [activeProgram, setActiveProgramState] = useState<ProgramWithMembership | null>(DEMO_MODE ? DEMO_PROGRAMS[0] : null)
  const [pendingInvite, setPendingInvite] = useState<ProgramInvite | null>(null)
  const [loading, setLoading] = useState(!DEMO_MODE)

  const onboardingStep = useMemo(
    () => (DEMO_MODE ? null : resolveOnboardingStep(profile, memberships, pendingInvite)),
    [profile, memberships, pendingInvite],
  )

  const needsOnboarding = !DEMO_MODE && !!user && onboardingStep !== null

  const activeMembership = useMemo(() => {
    if (!activeProgram) return null
    return memberships.find(m => m.program_id === activeProgram.id && m.status === 'active') ?? null
  }, [activeProgram, memberships])

  const activeRole = activeMembership?.role ?? (DEMO_MODE ? 'program_ops' : null)

  const loadUserData = useCallback(async (sessionUser: User, inviteToken?: string | null) => {
    try {
      const {
        getUserProfile,
        getProgramsForUser,
        getMemberships,
        getPendingInviteForEmail,
        getInviteByToken,
      } = await import('./supabase')

      const [prof, memberRows, progsFromClient] = await Promise.all([
        getUserProfile(sessionUser.id),
        getMemberships(sessionUser.id),
        getProgramsForUser(sessionUser.id),
      ])

      let progs = progsFromClient
      if (progs.length === 0) {
        try {
          const { fetchProgramsFromApi } = await import('./api')
          progs = await fetchProgramsFromApi()
        } catch {
          // API fallback failed — continue with empty programs
        }
      }

      let memberships = memberRows.data ?? []
      if (memberships.length === 0 && progs.length > 0) {
        memberships = progs.map(p => ({
          id: `${p.id}-membership`,
          program_id: p.id,
          user_id: sessionUser.id,
          role: p.memberRole,
          status: 'active' as const,
          invited_by: null,
          joined_at: p.created_at ?? new Date().toISOString(),
        }))
      }

      setProfile(prof)
      setMemberships(memberships)
      setPrograms(progs)

      let invite: ProgramInvite | null = null
      if (inviteToken) {
        const { data } = await getInviteByToken(inviteToken)
        invite = data
      } else if (sessionUser.email) {
        const { data } = await getPendingInviteForEmail(sessionUser.email)
        invite = data
      }
      setPendingInvite(invite)

      const lastId = prof?.last_active_program_id
      const active =
        progs.find(p => p.id === lastId)
        ?? progs.find(p => p.status === 'active')
        ?? progs[0]
        ?? null
      setActiveProgramState(active)
    } catch (err) {
      console.error('loadUserData failed:', err)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (DEMO_MODE || !user) return
    await loadUserData(user)
  }, [DEMO_MODE, user, loadUserData])

  const setActiveProgram = useCallback(async (p: Program) => {
    const withRole = programs.find(pr => pr.id === p.id) ?? { ...p, memberRole: 'product' as UserRole }
    setActiveProgramState(withRole)
    if (!DEMO_MODE && user) {
      const { setLastActiveProgram } = await import('./supabase')
      await setLastActiveProgram(p.id)
    }
  }, [programs, user])

  useEffect(() => {
    if (DEMO_MODE) return

    let subscription: { unsubscribe: () => void } | undefined

    import('./supabase').then(({ supabase }) => {
      const inviteToken = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('token')
        : null

      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null)
        setLoading(false)
        if (session?.user) {
          void loadUserData(session.user, inviteToken)
        }
      }).catch(err => {
        console.error('getSession failed:', err)
        setLoading(false)
      })

      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          void loadUserData(session.user)
        } else {
          setProfile(null)
          setMemberships([])
          setPrograms([])
          setActiveProgramState(null)
          setPendingInvite(null)
        }
      })
      subscription = data.subscription
    })

    return () => subscription?.unsubscribe()
  }, [loadUserData])

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      memberships,
      activeMembership,
      activeRole,
      programs,
      activeProgram,
      setActiveProgram,
      pendingInvite,
      onboardingStep,
      needsOnboarding,
      loading,
      refreshProfile,
      signOut: async () => {
        if (DEMO_MODE) {
          sessionStorage.removeItem('demo_entered')
          window.location.href = '/login'
          return
        }
        const { signOut } = await import('./supabase')
        await signOut()
        setUser(null)
        setProfile(null)
        setMemberships([])
        setPrograms([])
        setActiveProgramState(null)
        setPendingInvite(null)
        window.location.href = '/login'
      },
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
export type { UserProfile }
