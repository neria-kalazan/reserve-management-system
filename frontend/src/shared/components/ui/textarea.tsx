import * as React from 'react'

import { cn } from '@/shared/utils/cn'

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(({ className, ...props }, ref) => (
  <textarea
    className={cn('flex min-h-[96px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50', className)}
    ref={ref}
    {...props}
  />
))

Textarea.displayName = 'Textarea'

export { Textarea }