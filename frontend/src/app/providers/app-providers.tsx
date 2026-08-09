import type { PropsWithChildren } from 'react'

import { QueryClientProvider } from '@tanstack/react-query'

import { queryClient } from '@/app/providers/query-client'
import { AppErrorBoundary } from '@/shared/components/app-error-boundary'
import { ToastProvider, ToastViewport } from '@/shared/components/ui/toast'
import { TooltipProvider } from '@/shared/components/ui/tooltip'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={150}>
          <ToastProvider>
            {children}
            <ToastViewport />
          </ToastProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  )
}