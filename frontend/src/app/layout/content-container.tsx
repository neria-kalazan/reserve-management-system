import type { PropsWithChildren } from 'react'

import { cn } from '@/shared/utils/cn'

type ContentContainerProps = PropsWithChildren<{
  className?: string
}>

export function ContentContainer({ className, children }: ContentContainerProps) {
  return <div className={cn('content-grid w-full px-4 py-4 md:px-6 md:py-6', className)}>{children}</div>
}