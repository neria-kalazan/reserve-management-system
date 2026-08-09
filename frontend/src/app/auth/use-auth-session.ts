import { useQuery } from '@tanstack/react-query'

import { getAuthMe } from '@/api/auth'
import type { ApiError } from '@/api/client'
import type { AuthMeResponse, AuthSessionState } from '@/types/auth'

export const authSessionQueryKey = ['auth', 'session'] as const

export const unauthenticatedAuthSession: AuthSessionState = {
  status: 'unauthenticated',
  user: null,
  permissions: [],
}

const toAuthenticatedSession = (response: AuthMeResponse): AuthSessionState => ({
  status: 'authenticated',
  user: response.user,
  permissions: response.permissions,
})

const isApiError = (value: unknown): value is ApiError => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    typeof (value as { status?: unknown }).status === 'number'
  )
}

export const fetchAuthSession = async (): Promise<AuthSessionState> => {
  try {
    const response = await getAuthMe()
    return toAuthenticatedSession(response)
  } catch (error) {
    if (isApiError(error) && error.status === 401) {
      return unauthenticatedAuthSession
    }

    throw error
  }
}

export function useAuthSession() {
  const query = useQuery({
    queryKey: authSessionQueryKey,
    queryFn: fetchAuthSession,
    retry: false,
  })

  const session = query.data ?? unauthenticatedAuthSession

  return {
    ...query,
    isInitializing: query.isPending,
    isAuthenticated: session.status === 'authenticated',
    user: session.user,
    permissions: session.permissions,
    session,
  }
}
