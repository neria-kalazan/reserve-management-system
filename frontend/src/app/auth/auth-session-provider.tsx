import { useEffect, type PropsWithChildren } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { attachAuthStatusHandlers } from '@/app/auth/auth-status-handlers'
import { authSessionQueryKey, unauthenticatedAuthSession, useAuthSession } from '@/app/auth/use-auth-session'
import { useForbiddenStateStore } from '@/app/auth/use-forbidden-state-store'

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient()
  const setForbidden = useForbiddenStateStore((state) => state.setForbidden)
  const clearForbidden = useForbiddenStateStore((state) => state.clearForbidden)

  useAuthSession()

  useEffect(() => {
    return attachAuthStatusHandlers({
      setUnauthenticated: () => {
        clearForbidden()
        queryClient.setQueryData(authSessionQueryKey, unauthenticatedAuthSession)
      },
      setForbidden: (message) => {
        setForbidden(message)
      },
    })
  }, [clearForbidden, queryClient, setForbidden])

  return children
}
