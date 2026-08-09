import { useCallback } from 'react'

import { useAuthSession } from '@/app/auth/use-auth-session'

export function usePermissions() {
  const { isInitializing, isAuthenticated, permissions } = useAuthSession()

  const hasPermission = useCallback(
    (permission: string) => {
      if (isInitializing || !isAuthenticated) {
        return false
      }

      return permissions.some((entry) => entry.key === permission)
    },
    [isAuthenticated, isInitializing, permissions],
  )

  return {
    hasPermission,
    permissions,
    isInitializing,
    isAuthenticated,
  }
}
