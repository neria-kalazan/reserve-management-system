import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/app/auth/use-auth-session', () => ({
  useAuthSession: vi.fn(),
}))

vi.mock('@/features/activities/api/activity-tasks', () => ({
  getActivityTaskRequirements: vi.fn(),
  updateActivityTaskRequirements: vi.fn(),
}))

import { useAuthSession } from '@/app/auth/use-auth-session'
import {
  getActivityTaskRequirements,
  updateActivityTaskRequirements,
} from '@/features/activities/api/activity-tasks'
import {
  activityTaskRequirementsQueryKey,
  useActivityTaskRequirements,
  useUpdateActivityTaskRequirements,
} from '@/features/activities/queries/use-activity-tasks'

const useAuthSessionMock = vi.mocked(useAuthSession)
const getActivityTaskRequirementsMock = vi.mocked(getActivityTaskRequirements)
const updateActivityTaskRequirementsMock = vi.mocked(updateActivityTaskRequirements)

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

const createWrapper = (queryClient: QueryClient) => {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('Activity task requirements data layer', () => {
  it('fetches requirements by activity task id for authenticated users', async () => {
    useAuthSessionMock.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)

    getActivityTaskRequirementsMock.mockResolvedValueOnce({
      manpower: { required: true, quantity: 2 },
      roles: [{ roleId: 'role-1', required: true, quantity: 1 }],
      qualifications: [{ qualificationId: 'qual-1', required: false, quantity: 1 }],
    })

    const { result } = renderHook(() => useActivityTaskRequirements('task-1'), {
      wrapper: createWrapper(createQueryClient()),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getActivityTaskRequirementsMock).toHaveBeenCalledWith('task-1')
    expect(activityTaskRequirementsQueryKey('task-1')).toEqual(['activity-tasks', 'task-1', 'requirements'])
  })

  it('updates requirements with the exact backend DTO shape and invalidates the requirements and validation queries', async () => {
    useAuthSessionMock.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)

    updateActivityTaskRequirementsMock.mockResolvedValueOnce({
      manpower: { required: false, quantity: 3 },
      roles: [],
      qualifications: [],
    })

    const queryClient = createQueryClient()
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateActivityTaskRequirements('task-1'), {
      wrapper: createWrapper(queryClient),
    })

    await result.current.mutateAsync({
      manpower: { required: false, quantity: 3 },
      roles: [],
      qualifications: [],
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(updateActivityTaskRequirementsMock).toHaveBeenCalledWith('task-1', {
      manpower: { required: false, quantity: 3 },
      roles: [],
      qualifications: [],
    })
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['activity-tasks', 'task-1', 'requirements'] })
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['task-instances'] })
  })
})
