import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

const { registerAuthStatusHandlerMock, clearAuthStatusHandlerMock } = vi.hoisted(() => ({
  registerAuthStatusHandlerMock: vi.fn(),
  clearAuthStatusHandlerMock: vi.fn(),
}))

vi.mock('@/api/client', () => ({
  registerAuthStatusHandler: registerAuthStatusHandlerMock,
  clearAuthStatusHandler: clearAuthStatusHandlerMock,
}))

import {
  attachAuthStatusHandlers,
} from '@/app/auth/auth-status-handlers'
import {
  authSessionQueryKey,
  unauthenticatedAuthSession,
} from '@/app/auth/use-auth-session'

describe('attachAuthStatusHandlers', () => {
  it('registers 401 handler and transitions auth state to unauthenticated', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(authSessionQueryKey, {
      status: 'authenticated',
      user: {
        id: 'user-1',
        email: 'user@example.com',
        firstName: 'First',
        lastName: 'Last',
      },
      permissions: [{ key: 'MANAGE_COMPANIES', description: 'Manage companies' }],
    })

    const setUnauthenticated = () => {
      queryClient.setQueryData(authSessionQueryKey, unauthenticatedAuthSession)
    }

    const cleanup = attachAuthStatusHandlers({
      setUnauthenticated,
      setForbidden: () => undefined,
    })

    expect(registerAuthStatusHandlerMock).toHaveBeenCalledTimes(2)
    expect(registerAuthStatusHandlerMock).toHaveBeenCalledWith(401, expect.any(Function))

    const handler = registerAuthStatusHandlerMock.mock.calls[0]?.[1] as (() => void) | undefined
    handler?.()

    expect(queryClient.getQueryData(authSessionQueryKey)).toEqual(unauthenticatedAuthSession)

    cleanup()
    expect(clearAuthStatusHandlerMock).toHaveBeenCalledWith(401)
    expect(clearAuthStatusHandlerMock).toHaveBeenCalledWith(403)
  })

  it('registers 403 handler without transitioning to unauthenticated', () => {
    const setUnauthenticated = vi.fn()
    const setForbidden = vi.fn()

    attachAuthStatusHandlers({
      setUnauthenticated,
      setForbidden,
    })

    const handlerCall = registerAuthStatusHandlerMock.mock.calls.find((call) => call[0] === 403)
    const forbiddenHandler = handlerCall?.[1] as ((error: { message: string }) => void) | undefined
    forbiddenHandler?.({ message: 'Forbidden' })

    expect(setForbidden).toHaveBeenCalledWith('Forbidden')
    expect(setUnauthenticated).not.toHaveBeenCalled()
  })
})
