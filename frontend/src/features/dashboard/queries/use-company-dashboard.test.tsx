import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/app/auth/use-auth-session', () => ({ useAuthSession: vi.fn() }))
vi.mock('@/features/dashboard/api/dashboard', () => ({ getCompanyDashboard: vi.fn() }))

import { useAuthSession } from '@/app/auth/use-auth-session'
import { getCompanyDashboard } from '@/features/dashboard/api/dashboard'
import {
  companyDashboardQueryKey,
  useCompanyDashboard,
} from '@/features/dashboard/queries/use-company-dashboard'

const useAuthSessionMock = vi.mocked(useAuthSession)
const getCompanyDashboardMock = vi.mocked(getCompanyDashboard)

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useCompanyDashboard', () => {
  it('uses the authenticated user company id', async () => {
    useAuthSessionMock.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)
    getCompanyDashboardMock.mockResolvedValueOnce({ activeActivity: null } as never)

    const { result } = renderHook(() => useCompanyDashboard(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getCompanyDashboardMock).toHaveBeenCalledWith('company-1')
    expect(companyDashboardQueryKey('company-1')).toEqual(['companies', 'company-1', 'dashboard'])
  })

  it('does not execute without an authenticated company id', () => {
    useAuthSessionMock.mockReturnValue({
      isAuthenticated: false,
      user: null,
    } as ReturnType<typeof useAuthSession>)

    renderHook(() => useCompanyDashboard(), { wrapper: createWrapper() })

    expect(getCompanyDashboardMock).not.toHaveBeenCalled()
  })
})