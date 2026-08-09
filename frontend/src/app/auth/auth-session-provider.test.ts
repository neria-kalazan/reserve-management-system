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
      permissions: [{ key: 'users.read', description: 'Read users' }],
    })

    const setUnauthenticated = () => {
      queryClient.setQueryData(authSessionQueryKey, unauthenticatedAuthSession)
    }

    const cleanup = attachAuthStatusHandlers(setUnauthenticated)

    expect(registerAuthStatusHandlerMock).toHaveBeenCalledTimes(1)
    expect(registerAuthStatusHandlerMock).toHaveBeenCalledWith(401, expect.any(Function))

    const handler = registerAuthStatusHandlerMock.mock.calls[0]?.[1] as (() => void) | undefined
    handler?.()

    expect(queryClient.getQueryData(authSessionQueryKey)).toEqual(unauthenticatedAuthSession)

    cleanup()
    expect(clearAuthStatusHandlerMock).toHaveBeenCalledWith(401)
  })

  it('does not register 403 as authentication state transition', () => {
    attachAuthStatusHandlers(() => undefined)

    const statuses = registerAuthStatusHandlerMock.mock.calls.map((call) => call[0])

    expect(statuses).not.toContain(403)
    expect(statuses).toContain(401)
  })
})
