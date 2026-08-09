import type { ReactNode } from 'react'

import { LoadingSpinner } from '@/shared/components/loading-spinner'
import { cn } from '@/shared/utils/cn'

type LoadingStateProps = {
  title?: string
  description?: string
  className?: string
  trailing?: ReactNode
}

export function LoadingState({
  title = 'טוען נתונים',
  description = 'התשתית נטענת כעת.',
  className,
  trailing,
}: LoadingStateProps) {
  return (
    <div className={cn('flex items-center gap-4 rounded-lg border border-border bg-surface px-5 py-5 shadow-panel', className)}>
      <LoadingSpinner className="h-6 w-6" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      {trailing}
    </div>
  )
}