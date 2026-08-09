import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/api/auth', () => ({
  getAuthMe: vi.fn(),
}))

import { getAuthMe } from '@/api/auth'
import { fetchAuthSession, useAuthSession } from '@/app/auth/use-auth-session'

const getAuthMeMock = vi.mocked(getAuthMe)

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('auth session query', () => {
  it('returns unauthenticated session on 401', async () => {
    getAuthMeMock.mockRejectedValueOnce({ status: 401, message: 'Not authenticated' })

    await expect(fetchAuthSession()).resolves.toEqual({
      status: 'unauthenticated',
      user: null,
      permissions: [],
    })
  })

  it('returns authenticated session when /auth/me succeeds', async () => {
    getAuthMeMock.mockResolvedValueOnce({
      authenticated: true,
      user: {
        id: 'user-1',
        companyId: 'company-1',
        email: 'user@example.com',
        firstName: 'First',
        lastName: 'Last',
      },
      permissions: [{ key: 'users.read', description: 'Read users' }],
    })

    const { result } = renderHook(() => useAuthSession(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true)
    })

    expect(result.current.user).toEqual({
      id: 'user-1',
      companyId: 'company-1',
      email: 'user@example.com',
      firstName: 'First',
      lastName: 'Last',
    })
  })

  it('exposes initializing state while /auth/me is loading', () => {
    getAuthMeMock.mockImplementationOnce(
      () => new Promise(() => {
        // Keep pending to assert initialization.
      }),
    )

    const { result } = renderHook(() => useAuthSession(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isInitializing).toBe(true)
  })
})
