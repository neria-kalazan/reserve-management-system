import type { HTMLAttributes } from 'react'

import { cn } from '@/shared/utils/cn'

export function Alert({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('relative w-full rounded-lg border border-border bg-surface px-4 py-4 shadow-panel', className)} role="alert" {...props} />
}

export function AlertTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h5 className={cn('mb-1 text-sm font-semibold text-foreground', className)} {...props} />
}

export function AlertDescription({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('text-sm leading-6 text-muted', className)} {...props} />
}