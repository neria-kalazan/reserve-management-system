import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/app/auth/use-auth-session', () => ({
  useAuthSession: vi.fn(),
}))

vi.mock('@/features/activities/api/activity-tasks', () => ({
  getActivityTasks: vi.fn(),
}))

import { useAuthSession } from '@/app/auth/use-auth-session'
import { getActivityTasks } from '@/features/activities/api/activity-tasks'
import { activityTasksQueryKey, useActivityTasks } from '@/features/activities/queries/use-activity-tasks'

const useAuthSessionMock = vi.mocked(useAuthSession)
const getActivityTasksMock = vi.mocked(getActivityTasks)

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

const createWrapper = (queryClient: QueryClient) => {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useActivityTasks', () => {
  it('queries tasks by activity id for authenticated users', async () => {
    useAuthSessionMock.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)
    getActivityTasksMock.mockResolvedValueOnce([{ id: 'task-1', activityId: 'activity-1', name: 'הכנה', description: 'תיאור' }])

    const { result } = renderHook(() => useActivityTasks('activity-1'), {
      wrapper: createWrapper(createQueryClient()),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getActivityTasksMock).toHaveBeenCalledWith('activity-1')
    expect(activityTasksQueryKey('activity-1')).toEqual(['activities', 'activity-1', 'tasks'])
  })

  it('does not query when activity id is missing', () => {
    useAuthSessionMock.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)

    renderHook(() => useActivityTasks(undefined), {
      wrapper: createWrapper(createQueryClient()),
    })

    expect(getActivityTasksMock).not.toHaveBeenCalled()
  })
})
