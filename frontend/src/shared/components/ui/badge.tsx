import type { HTMLAttributes } from 'react'

import { cn } from '@/shared/utils/cn'

export function Badge({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors', className)}
      {...props}
    />
  )
}