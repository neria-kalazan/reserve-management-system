import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/app/auth/use-auth-session', () => ({
  useAuthSession: vi.fn(),
}))

vi.mock('@/features/activities/api/activity-tasks', () => ({
  getActivityTaskInstances: vi.fn(),
  getTaskInstanceWorkspace: vi.fn(),
  getAvailableUsers: vi.fn(),
  getCompanyUsers: vi.fn(),
  getCandidateEvaluation: vi.fn(),
  getTaskInstanceAssignments: vi.fn(),
  getTaskInstanceValidation: vi.fn(),
  createActivityTaskInstance: vi.fn(),
  createTaskInstanceAssignment: vi.fn(),
  updateActivityTaskInstance: vi.fn(),
  deleteActivityTaskInstance: vi.fn(),
  deleteAssignment: vi.fn(),
}))

import { useAuthSession } from '@/app/auth/use-auth-session'
import {
  createActivityTaskInstance,
  createTaskInstanceAssignment,
  deleteActivityTaskInstance,
  deleteAssignment,
  getActivityTaskInstances,
  getAvailableUsers,
  getCandidateEvaluation,
  getCompanyUsers,
  getTaskInstanceAssignments,
  getTaskInstanceValidation,
  getTaskInstanceWorkspace,
  updateActivityTaskInstance,
} from '@/features/activities/api/activity-tasks'
import {
  activityTaskInstancesQueryKey,
  availableUsersQueryKey,
  candidateEvaluationQueryKey,
  companyUsersQueryKey,
  taskInstanceAssignmentsQueryKey,
  taskInstanceValidationQueryKey,
  taskInstanceWorkspaceQueryKey,
  useActivityTaskInstances,
  useAvailableUsers,
  useCandidateEvaluation,
  useCompanyUsers,
  useCreateActivityTaskInstance,
  useCreateTaskInstanceAssignment,
  useDeleteActivityTaskInstance,
  useDeleteAssignment,
  useTaskInstanceAssignments,
  useTaskInstanceValidation,
  useTaskInstanceWorkspace,
  useUpdateActivityTaskInstance,
} from '@/features/activities/queries/use-activity-tasks'

const useAuthSessionMock = vi.mocked(useAuthSession)
const getActivityTaskInstancesMock = vi.mocked(getActivityTaskInstances)
const getTaskInstanceWorkspaceMock = vi.mocked(getTaskInstanceWorkspace)
const getAvailableUsersMock = vi.mocked(getAvailableUsers)
const getCompanyUsersMock = vi.mocked(getCompanyUsers)
const getCandidateEvaluationMock = vi.mocked(getCandidateEvaluation)
const getTaskInstanceAssignmentsMock = vi.mocked(getTaskInstanceAssignments)
const getTaskInstanceValidationMock = vi.mocked(getTaskInstanceValidation)
const createActivityTaskInstanceMock = vi.mocked(createActivityTaskInstance)
const createTaskInstanceAssignmentMock = vi.mocked(createTaskInstanceAssignment)
const updateActivityTaskInstanceMock = vi.mocked(updateActivityTaskInstance)
const deleteActivityTaskInstanceMock = vi.mocked(deleteActivityTaskInstance)
const deleteAssignmentMock = vi.mocked(deleteAssignment)

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

  it('fetches task instance workspace, available users, company users, candidate evaluation, and assignments using the backend-backed task-instance contracts', async () => {
    useAuthSessionMock.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)

    getTaskInstanceWorkspaceMock.mockResolvedValueOnce({
      taskInstance: {
        id: 'instance-1',
        title: 'Evening assignment',
        startTime: '2026-01-01T18:00:00.000Z',
        endTime: '2026-01-01T22:00:00.000Z',
        activityTask: {
          id: 'task-1',
          name: 'Shift',
          activity: { id: 'activity-1' },
        },
      },
      requirements: {
        manpower: { required: true, quantity: 1 },
        roleRequirements: [{ roleId: 'role-1', required: true, quantity: 1 }],
        qualificationRequirements: [{ qualificationId: 'qual-1', required: true, quantity: 1 }],
      },
      currentAssignments: [{ assignmentId: 'assignment-1', userId: 'user-2', user: { id: 'user-2', firstName: 'Jane', lastName: 'Doe' } }],
      candidates: [{ id: 'user-3', firstName: 'John', lastName: 'Smith', phone: '0500000000', email: 'john@example.com', personalNumber: '123', isActive: true }],
      validation: { requiredErrors: [], warnings: [], summary: { isValid: true } },
    })

    getAvailableUsersMock.mockResolvedValueOnce([
      { id: 'user-3', firstName: 'John', lastName: 'Smith', phone: '0500000000', email: 'john@example.com', personalNumber: '123', isActive: true },
    ])

    getCompanyUsersMock.mockResolvedValueOnce([
      { id: 'user-3', firstName: 'John', lastName: 'Smith', phone: '0500000000', email: 'john@example.com', personalNumber: '123', isActive: true, unit: null },
    ])

    getCandidateEvaluationMock.mockResolvedValueOnce({
      userId: 'user-3',
      severity: 'NORMAL',
      reasonCodes: [],
      reasonMessages: [],
    })

    getTaskInstanceAssignmentsMock.mockResolvedValueOnce([
      {
        id: 'assignment-1',
        taskInstanceId: 'instance-1',
        userId: 'user-2',
        createdBy: null,
        createdAt: '2026-01-01T18:00:00.000Z',
        updatedAt: '2026-01-01T18:00:00.000Z',
        user: {
          id: 'user-2',
          firstName: 'Jane',
          lastName: 'Doe',
          phone: '0500000001',
          email: 'jane@example.com',
          personalNumber: '456',
          isActive: true,
        },
      },
    ])

    const workspaceResult = renderHook(() => useTaskInstanceWorkspace('instance-1'), {
      wrapper: createWrapper(createQueryClient()),
    })
    const availableUsersResult = renderHook(() => useAvailableUsers('instance-1'), {
      wrapper: createWrapper(createQueryClient()),
    })
    const companyUsersResult = renderHook(() => useCompanyUsers('company-1'), {
      wrapper: createWrapper(createQueryClient()),
    })
    const candidateResult = renderHook(() => useCandidateEvaluation('instance-1', 'user-3'), {
      wrapper: createWrapper(createQueryClient()),
    })
    const assignmentsResult = renderHook(() => useTaskInstanceAssignments('instance-1'), {
      wrapper: createWrapper(createQueryClient()),
    })

    await waitFor(() => expect(workspaceResult.result.current.isSuccess).toBe(true))
    await waitFor(() => expect(availableUsersResult.result.current.isSuccess).toBe(true))
    await waitFor(() => expect(companyUsersResult.result.current.isSuccess).toBe(true))
    await waitFor(() => expect(candidateResult.result.current.isSuccess).toBe(true))
    await waitFor(() => expect(assignmentsResult.result.current.isSuccess).toBe(true))

    expect(getTaskInstanceWorkspaceMock).toHaveBeenCalledWith('instance-1')
    expect(getAvailableUsersMock).toHaveBeenCalledWith('instance-1')
    expect(getCompanyUsersMock).toHaveBeenCalledWith('company-1')
    expect(getCandidateEvaluationMock).toHaveBeenCalledWith('instance-1', 'user-3')
    expect(getTaskInstanceAssignmentsMock).toHaveBeenCalledWith('instance-1')

    expect(taskInstanceWorkspaceQueryKey('instance-1')).toEqual(['task-instances', 'instance-1', 'workspace'])
    expect(availableUsersQueryKey('instance-1')).toEqual(['task-instances', 'instance-1', 'available-users'])
    expect(companyUsersQueryKey('company-1')).toEqual(['companies', 'company-1', 'users'])
    expect(candidateEvaluationQueryKey('instance-1', 'user-3')).toEqual(['task-instances', 'instance-1', 'candidate-evaluation', 'user-3'])
    expect(taskInstanceAssignmentsQueryKey('instance-1')).toEqual(['task-instances', 'instance-1', 'assignments'])
  })

  it('creates and deletes assignments while invalidating assignments, validation, and scoped scheduling-day state', async () => {
    useAuthSessionMock.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)

    const queryClient = createQueryClient()
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    createTaskInstanceAssignmentMock.mockResolvedValueOnce({
      assignment: {
        id: 'assignment-2',
        taskInstanceId: 'instance-2',
        userId: 'user-9',
        createdBy: null,
        createdAt: '2026-01-02T09:00:00.000Z',
        updatedAt: '2026-01-02T09:00:00.000Z',
        user: {
          id: 'user-9',
          firstName: 'Alice',
          lastName: 'Brown',
          phone: null,
          email: null,
          personalNumber: '999',
          isActive: true,
        },
      },
      validation: { requiredErrors: [], warnings: [], summary: { isValid: true } },
    })

    deleteAssignmentMock.mockResolvedValueOnce({
      id: 'assignment-2',
      taskInstanceId: 'instance-2',
      userId: 'user-9',
      createdBy: null,
      createdAt: '2026-01-02T09:00:00.000Z',
      updatedAt: '2026-01-02T09:00:00.000Z',
      user: {
        id: 'user-9',
        firstName: 'Alice',
        lastName: 'Brown',
        phone: null,
        email: null,
        personalNumber: '999',
        isActive: true,
      },
    })

    const createWrapperWithQueryClient = createWrapper(queryClient)
    const schedulingDayScope = { activityId: 'activity-1', date: '2026-01-02' }

    const createAssignmentResult = renderHook(() => useCreateTaskInstanceAssignment('instance-2', schedulingDayScope), {
      wrapper: createWrapperWithQueryClient,
    })
    const deleteAssignmentResult = renderHook(() => useDeleteAssignment(schedulingDayScope), {
      wrapper: createWrapperWithQueryClient,
    })

    await createAssignmentResult.result.current.mutateAsync({ userId: 'user-9' })
    await deleteAssignmentResult.result.current.mutateAsync('assignment-2')

    expect(createTaskInstanceAssignmentMock).toHaveBeenCalledWith('instance-2', { userId: 'user-9' })
    expect(deleteAssignmentMock).toHaveBeenCalledWith('assignment-2')
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['task-instances', 'instance-2', 'assignments'] })
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['task-instances', 'instance-2', 'validation'] })
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['task-instances', 'instance-2', 'workspace'] })
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['task-instances', 'instance-2', 'available-users'] })
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['activities', 'activity-1', 'scheduling', 'day', '2026-01-02'],
    })
  })

  it('propagates assignment mutation errors to the caller', async () => {
    useAuthSessionMock.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)

    const createFailure = new Error('create assignment failed')
    const deleteFailure = new Error('delete assignment failed')
    createTaskInstanceAssignmentMock.mockRejectedValueOnce(createFailure)
    deleteAssignmentMock.mockRejectedValueOnce(deleteFailure)

    const createWrapperWithQueryClient = createWrapper(createQueryClient())
    const createAssignmentResult = renderHook(() => useCreateTaskInstanceAssignment('instance-2'), {
      wrapper: createWrapperWithQueryClient,
    })
    const deleteAssignmentResult = renderHook(() => useDeleteAssignment(), {
      wrapper: createWrapperWithQueryClient,
    })

    await expect(
      createAssignmentResult.result.current.mutateAsync({ userId: 'user-9' }),
    ).rejects.toThrow('create assignment failed')
    await expect(deleteAssignmentResult.result.current.mutateAsync('assignment-2')).rejects.toThrow(
      'delete assignment failed',
    )
  })
})
