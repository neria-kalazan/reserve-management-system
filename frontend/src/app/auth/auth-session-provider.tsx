import { useEffect, type PropsWithChildren } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { attachAuthStatusHandlers } from '@/app/auth/auth-status-handlers'
import { authSessionQueryKey, unauthenticatedAuthSession, useAuthSession } from '@/app/auth/use-auth-session'

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient()

  useAuthSession()

  useEffect(() => {
    return attachAuthStatusHandlers(() => {
      queryClient.setQueryData(authSessionQueryKey, unauthenticatedAuthSession)
    })
  }, [queryClient])

  return children
}
