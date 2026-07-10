import { ProgramInvite, ProgramMember, UserProfile } from './types'

export type OnboardingStep = 'account' | 'join' | 'create-program'

export function resolveOnboardingStep(
  profile: UserProfile | null,
  memberships: ProgramMember[],
  pendingInvite: ProgramInvite | null,
): OnboardingStep | null {
  if (!profile) return null
  if (!profile.account_setup_complete) return 'account'
  if (pendingInvite) return 'join'
  const active = memberships.filter(m => m.status === 'active')
  if (active.length === 0) return 'create-program'
  return null
}

export function onboardingPath(step: OnboardingStep | null): string | null {
  switch (step) {
    case 'account':
      return '/onboarding/account'
    case 'join':
      return '/onboarding/join'
    case 'create-program':
      return '/onboarding/create-program'
    default:
      return null
  }
}

export function roleLandingPath(role: string): string {
  switch (role) {
    case 'npi':
      return '/timeline'
    case 'hw_quality':
      return '/risks'
    case 'marketing':
      return '/launch'
    default:
      return '/'
  }
}
