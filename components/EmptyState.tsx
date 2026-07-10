import Link from 'next/link'

type Props = {
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
}

export default function EmptyState({ title, description, actionLabel, actionHref, onAction }: Props) {
  return (
    <div className="card border-dashed border-gray-200 bg-gray-50/50 text-center py-10 px-6">
      <div className="text-sm font-medium text-gray-800 mb-1">{title}</div>
      <p className="text-sm text-gray-400 max-w-md mx-auto mb-4">{description}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn-primary inline-flex">{actionLabel}</Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <button type="button" onClick={onAction} className="btn-primary">{actionLabel}</button>
      )}
    </div>
  )
}
