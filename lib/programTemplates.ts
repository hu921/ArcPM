import { UserRole } from './types'

export type ProgramTemplate = 'hardware' | 'empty'

export const HARDWARE_TRACKS: {
  name: string
  color: string
  status: string
  owner_role: UserRole
}[] = [
  { name: 'Hardware',   color: '#7F77DD', status: 'on-track', owner_role: 'npi' },
  { name: 'Firmware',   color: '#378ADD', status: 'on-track', owner_role: 'npi' },
  { name: 'Algorithm',  color: '#1D9E75', status: 'on-track', owner_role: 'product' },
  { name: 'App',        color: '#1D9E75', status: 'on-track', owner_role: 'product' },
  { name: 'Validation', color: '#BA7517', status: 'on-track', owner_role: 'npi' },
  { name: 'Regulatory', color: '#E24B4A', status: 'on-track', owner_role: 'npi' },
  { name: 'Packaging',  color: '#7F77DD', status: 'on-track', owner_role: 'marketing' },
  { name: 'GTM',        color: '#378ADD', status: 'on-track', owner_role: 'marketing' },
]
