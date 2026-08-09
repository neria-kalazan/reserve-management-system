import type { ReactNode } from 'react'

import { Inbox } from 'lucide-react'

import { cn } from '@/shared/utils/cn'

type EmptyStateProps = {
  title: string
  description: string
  action?: ReactNode
  icon?: ReactNode
  className?: string
}

export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface px-6 py-10 text-center', className)}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-background text-muted">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}