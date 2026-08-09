import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

const { postAuthLogoutMock, navigateMock } = vi.hoisted(() => ({
  postAuthLogoutMock: vi.fn(),
  navigateMock: vi.fn(),
}))

vi.mock('@/api/auth', () => ({
  postAuthLogout: postAuthLogoutMock,
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

import { authSessionQueryKey, unauthenticatedAuthSession } from '@/app/auth/use-auth-session'
import { useAuthLogout } from '@/app/auth/use-auth-logout'

const createWrapper = (queryClient: QueryClient) => {
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }
}

describe('useAuthLogout', () => {
  it('calls logout endpoint and transitions to unauthenticated + login route', async () => {
    const queryClient = new QueryClient()

    queryClient.setQueryData(authSessionQueryKey, {
      status: 'authenticated',
      user: {
        id: 'user-1',
        companyId: 'company-1',
        email: 'user@example.com',
        firstName: 'First',
        lastName: 'Last',
      },
      permissions: [{ key: 'users.read', description: 'Read users' }],
    })

    postAuthLogoutMock.mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useAuthLogout(), {
      wrapper: createWrapper(queryClient),
    })

    await result.current.mutateAsync()

    expect(postAuthLogoutMock).toHaveBeenCalledTimes(1)
    expect(queryClient.getQueryData(authSessionQueryKey)).toEqual(unauthenticatedAuthSession)
    expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true })
  })
})
