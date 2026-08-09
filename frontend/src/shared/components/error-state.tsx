import type { ReactNode } from 'react'

import { AlertTriangle } from 'lucide-react'

import { cn } from '@/shared/utils/cn'

type ErrorStateProps = {
  title: string
  description: string
  action?: ReactNode
  className?: string
}

export function ErrorState({ title, description, action, className }: ErrorStateProps) {
  return (
    <div className={cn('rounded-lg border border-danger/30 bg-danger-soft px-6 py-6 text-right shadow-panel', className)}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/15 text-danger">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
          {action ? <div className="pt-2">{action}</div> : null}
        </div>
      </div>
    </div>
  )
}