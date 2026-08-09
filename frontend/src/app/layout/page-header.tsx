import type { ReactNode } from 'react'

import { cn } from '@/shared/utils/cn'

type PageHeaderProps = {
  title: string
  description: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-4 border-b border-border px-4 py-5 md:flex-row md:items-start md:justify-between md:px-6', className)}>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h1>
        <p className="max-w-2xl text-sm text-muted md:text-base">{description}</p>
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </header>
  )
}