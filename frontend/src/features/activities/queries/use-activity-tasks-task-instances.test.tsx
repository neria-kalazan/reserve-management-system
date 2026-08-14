import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/app/auth/use-auth-session', () => ({
  useAuthSession: vi.fn(),
}))

vi.mock('@/features/activities/api/activity-tasks', () => ({
  getActivityTaskInstances: vi.fn(),
  getTaskInstanceValidation: vi.fn(),
  createActivityTaskInstance: vi.fn(),
  updateActivityTaskInstance: vi.fn(),
  deleteActivityTaskInstance: vi.fn(),
}))

import { useAuthSession } from '@/app/auth/use-auth-session'
import {
  createActivityTaskInstance,
  deleteActivityTaskInstance,
  getActivityTaskInstances,
  getTaskInstanceValidation,
  updateActivityTaskInstance,
} from '@/features/activities/api/activity-tasks'
import {
  activityTaskInstancesQueryKey,
  taskInstanceValidationQueryKey,
  useActivityTaskInstances,
  useCreateActivityTaskInstance,
  useDeleteActivityTaskInstance,
  useTaskInstanceValidation,
  useUpdateActivityTaskInstance,
} from '@/features/activities/queries/use-activity-tasks'

const useAuthSessionMock = vi.mocked(useAuthSession)
const getActivityTaskInstancesMock = vi.mocked(getActivityTaskInstances)
const getTaskInstanceValidationMock = vi.mocked(getTaskInstanceValidation)
const createActivityTaskInstanceMock = vi.mocked(createActivityTaskInstance)
const updateActivityTaskInstanceMock = vi.mocked(updateActivityTaskInstance)
const deleteActivityTaskInstanceMock = vi.mocked(deleteActivityTaskInstance)

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

describe('Activity task instances data layer', () => {
  it('fetches task instances by activity task id for authenticated users', async () => {
    useAuthSessionMock.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)

    getActivityTaskInstancesMock.mockResolvedValueOnce([
      {
        id: 'instance-1',
        activityTaskId: 'task-1',
        title: 'Morning shift',
        startTime: '2026-01-01T09:00:00.000Z',
        endTime: '2026-01-01T17:00:00.000Z',
      },
    ])

    const { result } = renderHook(() => useActivityTaskInstances('task-1'), {
      wrapper: createWrapper(createQueryClient()),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getActivityTaskInstancesMock).toHaveBeenCalledWith('task-1')
    expect(activityTaskInstancesQueryKey('task-1')).toEqual(['activity-tasks', 'task-1', 'task-instances'])
  })

  it('fetches task instance validation by instance id for authenticated users', async () => {
    useAuthSessionMock.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)

    getTaskInstanceValidationMock.mockResolvedValueOnce({
      requiredErrors: [{ type: 'MANPOWER', message: 'Missing required manpower' }],
      warnings: [{ type: 'AVAILABILITY', message: 'User is not available for this task time' }],
      summary: { isValid: false },
    })

    const { result } = renderHook(() => useTaskInstanceValidation('instance-1'), {
      wrapper: createWrapper(createQueryClient()),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getTaskInstanceValidationMock).toHaveBeenCalledWith('instance-1')
    expect(taskInstanceValidationQueryKey('instance-1')).toEqual(['task-instances', 'instance-1', 'validation'])
    expect(result.current.data).toEqual({
      requiredErrors: [{ type: 'MANPOWER', message: 'Missing required manpower' }],
      warnings: [{ type: 'AVAILABILITY', message: 'User is not available for this task time' }],
      summary: { isValid: false },
    })
  })

  it('does not fetch validation when no task instance id exists', async () => {
    useAuthSessionMock.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)

    const { result } = renderHook(() => useTaskInstanceValidation(undefined), {
      wrapper: createWrapper(createQueryClient()),
    })

    await waitFor(() => expect(result.current.fetchStatus).not.toBe('fetching'))
    expect(getTaskInstanceValidationMock).not.toHaveBeenCalled()
    expect(result.current.data).toBeUndefined()
  })

  it('creates, updates, and deletes task instances while invalidating the task instance validation query', async () => {
    useAuthSessionMock.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)

    const queryClient = createQueryClient()
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    createActivityTaskInstanceMock.mockResolvedValueOnce({
      id: 'instance-2',
      activityTaskId: 'task-1',
      title: 'Evening shift',
      startTime: '2026-01-01T18:00:00.000Z',
      endTime: '2026-01-01T22:00:00.000Z',
    })

    updateActivityTaskInstanceMock.mockResolvedValueOnce({
      id: 'instance-2',
      activityTaskId: 'task-1',
      title: 'Updated shift',
      startTime: '2026-01-01T18:00:00.000Z',
      endTime: '2026-01-01T22:00:00.000Z',
    })

    deleteActivityTaskInstanceMock.mockResolvedValueOnce({
      id: 'instance-2',
      activityTaskId: 'task-1',
      title: 'Updated shift',
      startTime: '2026-01-01T18:00:00.000Z',
      endTime: '2026-01-01T22:00:00.000Z',
    })

    const createWrapperWithQueryClient = createWrapper(queryClient)

    const createResult = renderHook(() => useCreateActivityTaskInstance('task-1'), {
      wrapper: createWrapperWithQueryClient,
    })
    const updateResult = renderHook(() => useUpdateActivityTaskInstance(), {
      wrapper: createWrapperWithQueryClient,
    })
    const deleteResult = renderHook(() => useDeleteActivityTaskInstance(), {
      wrapper: createWrapperWithQueryClient,
    })

    await createResult.result.current.mutateAsync({
      title: 'Evening shift',
      startTime: '2026-01-01T18:00:00.000Z',
      endTime: '2026-01-01T22:00:00.000Z',
    })

    await updateResult.result.current.mutateAsync({
      taskInstanceId: 'instance-2',
      body: {
        title: 'Updated shift',
      },
    })

    await deleteResult.result.current.mutateAsync('instance-2')

    expect(createActivityTaskInstanceMock).toHaveBeenCalledWith('task-1', {
      title: 'Evening shift',
      startTime: '2026-01-01T18:00:00.000Z',
      endTime: '2026-01-01T22:00:00.000Z',
    })
    expect(updateActivityTaskInstanceMock).toHaveBeenCalledWith('instance-2', {
      title: 'Updated shift',
    })
    expect(deleteActivityTaskInstanceMock).toHaveBeenCalledWith('instance-2')
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['activity-tasks', 'task-1', 'task-instances'] })
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['task-instances', 'instance-2', 'validation'] })
  })
})
