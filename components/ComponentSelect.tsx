'use client'
import Link from 'next/link'
import { ProgramComponent } from '@/lib/types'

interface Props {
  components: ProgramComponent[]
  loading?: boolean
  value: string
  onChange: (name: string, component?: ProgramComponent) => void
  required?: boolean
}

export default function ComponentSelect({
  components,
  loading,
  value,
  onChange,
  required,
}: Props) {
  if (loading) {
    return (
      <select className="input-base" disabled>
        <option>Loading components…</option>
      </select>
    )
  }

  if (components.length === 0) {
    return (
      <div>
        <select className="input-base" disabled>
          <option value="">No components defined</option>
        </select>
        <p className="text-[11px] text-gray-400 mt-1">
          Add components in{' '}
          <Link href="/program/settings" className="text-indigo-600 hover:underline">
            Program settings
          </Link>
          .
        </p>
      </div>
    )
  }

  const hasLegacyValue = value && !components.some(c => c.name === value)

  return (
    <select
      className="input-base"
      value={value}
      required={required}
      onChange={e => {
        const comp = components.find(c => c.name === e.target.value)
        onChange(e.target.value, comp)
      }}
    >
      <option value="">Select component…</option>
      {hasLegacyValue && <option value={value}>{value} (not in list)</option>}
      {components.map(c => (
        <option key={c.id} value={c.name}>{c.name}</option>
      ))}
    </select>
  )
}
