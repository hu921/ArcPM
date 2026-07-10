'use client'

import { FormEvent, ReactNode } from 'react'

type Props = {
  title: string
  onSubmit: (e: FormEvent) => void
  onCancel: () => void
  submitLabel: string
  children: ReactNode
}

/** Shared card wrapper for add / edit forms across program pages. */
export default function ItemFormCard({ title, onSubmit, onCancel, submitLabel, children }: Props) {
  return (
    <form onSubmit={onSubmit} className="card flex flex-col gap-3 border-indigo-200 bg-indigo-50/20">
      <div className="flex items-center justify-between">
        <div className="section-title mb-0">{title}</div>
        <button type="button" onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600">
          Cancel
        </button>
      </div>
      {children}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary">{submitLabel}</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Discard</button>
      </div>
    </form>
  )
}

export function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onClick() }}
      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-1 py-0.5 rounded hover:bg-indigo-50"
    >
      Edit
    </button>
  )
}
