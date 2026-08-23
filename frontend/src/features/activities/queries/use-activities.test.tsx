import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/app/auth/use-auth-session', () => ({ useAuthSession: vi.fn() }))
vi.mock('@/features/activities/api/activities', () => ({
  getCompanyActivities: vi.fn(),
  getActivityById: vi.fn(),
  getActivityOverview: vi.fn(),
  getActivityAvailability: vi.fn(),
  getActivityPersonnelStatusMatrix: vi.fn(),
  generateActivityAvailability: vi.fn(),
  bulkUpdateActivityAvailability: vi.fn(),
  createActivityUserStatus: vi.fn(),
  updateActivityUserStatus: vi.fn(),
  deleteActivityUserStatus: vi.fn(),
  postCompanyActivity: vi.fn(),
  patchActivity: vi.fn(),
}))

import { useAuthSession } from '@/app/auth/use-auth-session'
import {
  bulkUpdateActivityAvailability,
  createActivityUserStatus,
  deleteActivityUserStatus,
  generateActivityAvailability,
  getActivityAvailability,
  getActivityById,
  getActivityOverview,
  getActivityPersonnelStatusMatrix,
  getCompanyActivities,
  patchActivity,
  postCompanyActivity,
  updateActivityUserStatus,
} from '@/features/activities/api/activities'
import {
  activitiesListQueryKey,
  activityAvailabilityQueryKey,
  activityDetailQueryKey,
  activityOverviewQueryKey,
  activityPersonnelStatusMatrixQueryKey,
  useActivityAvailability,
  useActivityById,
  useActivityOverview,
  useActivityPersonnelStatusMatrix,
  useBulkUpdateActivityAvailability,
  useCompanyActivities,
  useCreateActivity,
  useCreateActivityUserStatus,
  useDeleteActivityUserStatus,
  useGenerateActivityAvailability,
  useUpdateActivity,
  useUpdateActivityUserStatus,
} from '@/features/activities/queries/use-activities'

const useAuthSessionMock = vi.mocked(useAuthSession)
const getCompanyActivitiesMock = vi.mocked(getCompanyActivities)
const getActivityByIdMock = vi.mocked(getActivityById)
const getActivityOverviewMock = vi.mocked(getActivityOverview)
const getActivityAvailabilityMock = vi.mocked(getActivityAvailability)
const getActivityPersonnelStatusMatrixMock = vi.mocked(getActivityPersonnelStatusMatrix)
const generateActivityAvailabilityMock = vi.mocked(generateActivityAvailability)
const bulkUpdateActivityAvailabilityMock = vi.mocked(bulkUpdateActivityAvailability)
const createActivityUserStatusMock = vi.mocked(createActivityUserStatus)
const updateActivityUserStatusMock = vi.mocked(updateActivityUserStatus)
const deleteActivityUserStatusMock = vi.mocked(deleteActivityUserStatus)
const postCompanyActivityMock = vi.mocked(postCompanyActivity)
const patchActivityMock = vi.mocked(patchActivity)

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

describe('use-activities hooks', () => {
  it('uses authenticated company id for list query', async () => {
    useAuthSessionMock.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)
    getCompanyActivitiesMock.mockResolvedValueOnce([])

    const { result } = renderHook(() => useCompanyActivities(), {
      wrapper: createWrapper(createQueryClient()),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getCompanyActivitiesMock).toHaveBeenCalledWith('company-1')
    expect(activitiesListQueryKey('company-1')).toEqual(['companies', 'company-1', 'activities'])
  })

  it('does not query list without authenticated company id', () => {
    useAuthSessionMock.mockReturnValue({
      isAuthenticated: false,
      user: null,
    } as ReturnType<typeof useAuthSession>)

    renderHook(() => useCompanyActivities(), {
      wrapper: createWrapper(createQueryClient()),
    })

    expect(getCompanyActivitiesMock).not.toHaveBeenCalled()
  })

  it('queries detail by id for authenticated users', async () => {
    useAuthSessionMock.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)
    getActivityByIdMock.mockResolvedValueOnce({ id: 'activity-1' } as never)

    const { result } = renderHook(() => useActivityById('activity-1'), {
      wrapper: createWrapper(createQueryClient()),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getActivityByIdMock).toHaveBeenCalledWith('activity-1')
    expect(activityDetailQueryKey('activity-1')).toEqual(['activities', 'activity-1'])
  })

  it('does not query detail when id is missing', () => {
    useAuthSessionMock.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)

    renderHook(() => useActivityById(undefined), {
      wrapper: createWrapper(createQueryClient()),
    })

    expect(getActivityByIdMock).not.toHaveBeenCalled()
  })

  it('queries availability by id for authenticated users', async () => {
    useAuthSessionMock.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)
    getActivityAvailabilityMock.mockResolvedValueOnce([{ id: 'status-1' }] as never)

    const { result } = renderHook(() => useActivityAvailability('activity-1'), {
      wrapper: createWrapper(createQueryClient()),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getActivityAvailabilityMock).toHaveBeenCalledWith('activity-1')
    expect(activityAvailabilityQueryKey('activity-1')).toEqual(['activities', 'activity-1', 'availability'])
  })

  it('does not query availability when id is missing', () => {
    useAuthSessionMock.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)

    renderHook(() => useActivityAvailability(undefined), {
      wrapper: createWrapper(createQueryClient()),
    })

    expect(getActivityAvailabilityMock).not.toHaveBeenCalled()
  })

  it('queries overview by id for authenticated users', async () => {
    useAuthSessionMock.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)
    getActivityOverviewMock.mockResolvedValueOnce({
      activity: { id: 'activity-1' },
      manpowerSummary: { participantCount: 2 },
    } as never)

    const { result } = renderHook(() => useActivityOverview('activity-1'), {
      wrapper: createWrapper(createQueryClient()),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getActivityOverviewMock).toHaveBeenCalledWith('activity-1')
    expect(activityOverviewQueryKey('activity-1')).toEqual(['activities', 'activity-1', 'overview'])
  })

  it('queries personnel status matrix by activity id for authenticated users', async () => {
    useAuthSessionMock.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)
    getActivityPersonnelStatusMatrixMock.mockResolvedValueOnce({
      activity: { id: 'activity-1', name: 'Ops' },
      dates: ['2026-08-13'],
      rows: [],
      dailySummary: [],
    } as never)

    const { result } = renderHook(() => useActivityPersonnelStatusMatrix('activity-1'), {
      wrapper: createWrapper(createQueryClient()),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getActivityPersonnelStatusMatrixMock).toHaveBeenCalledWith('activity-1')
    expect(activityPersonnelStatusMatrixQueryKey('activity-1')).toEqual(['activities', 'activity-1', 'personnel-status-matrix'])
  })

  it('does not query overview when id is missing', () => {
    useAuthSessionMock.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)

    renderHook(() => useActivityOverview(undefined), {
      wrapper: createWrapper(createQueryClient()),
    })

    expect(getActivityOverviewMock).not.toHaveBeenCalled()
  })

  it('generate availability mutation invalidates availability cache', async () => {
    const queryClient = createQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    useAuthSessionMock.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)

    generateActivityAvailabilityMock.mockResolvedValueOnce([{ id: 'status-1' }] as never)

    const { result } = renderHook(() => useGenerateActivityAvailability('activity-1'), {
      wrapper: createWrapper(queryClient),
    })

    await result.current.mutateAsync()

    expect(generateActivityAvailabilityMock).toHaveBeenCalledWith('activity-1')
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['activities', 'activity-1', 'availability'],
    })
  })

  it('bulk update availability mutation invalidates availability cache', async () => {
    const queryClient = createQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    useAuthSessionMock.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)

    bulkUpdateActivityAvailabilityMock.mockResolvedValueOnce({
      updatedCount: 1,
      updatedRecords: [{ id: 'status-1', availability: 'MORNING' }],
    } as never)

    const { result } = renderHook(() => useBulkUpdateActivityAvailability('activity-1'), {
      wrapper: createWrapper(queryClient),
    })

    await result.current.mutateAsync({
      userIds: ['user-1'],
      startDate: '2026-08-13',
      endDate: '2026-08-15',
      availability: 'MORNING',
    })

    expect(bulkUpdateActivityAvailabilityMock).toHaveBeenCalledWith('activity-1', {
      userIds: ['user-1'],
      startDate: '2026-08-13',
      endDate: '2026-08-15',
      availability: 'MORNING',
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['activities', 'activity-1', 'availability'],
    })
  })

  it('personnel status mutations update the matrix cache optimistically and only invalidate overview', async () => {
    const queryClient = createQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    useAuthSessionMock.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)

    const initialMatrix = {
      activity: { id: 'activity-1', name: 'Ops', companyId: 'company-1', startDate: '2026-08-10', endDate: '2026-08-12' },
      dates: ['2026-08-10', '2026-08-11', '2026-08-12'],
      rows: [
        {
          user: { id: 'user-2', firstName: 'Bob', lastName: 'Jones', email: 'bob@example.com' },
          cells: {
            '2026-08-10': 'ACTIVE',
            '2026-08-11': null,
            '2026-08-12': 'HOLIDAY',
          },
          summary: { activeCount: 1, holidayCount: 0, sickCount: 0, releasedCount: 0, yamam: 1, complete: false },
        },
      ],
      dailySummary: [
        { date: '2026-08-10', activeCount: 1, holidayCount: 0, sickCount: 0, releasedCount: 0, yamam: 1 },
        { date: '2026-08-11', activeCount: 0, holidayCount: 0, sickCount: 0, releasedCount: 0, yamam: 0 },
        { date: '2026-08-12', activeCount: 0, holidayCount: 1, sickCount: 0, releasedCount: 0, yamam: 1 },
      ],
    }

    const initialOverview = {
      activity: { id: 'activity-1', name: 'Ops', status: 'ACTIVE', company: { id: 'company-1', name: 'Demo Company', status: 'ACTIVE' } },
      manpowerSummary: { participantCount: 1, dailyStatusSummary: { ACTIVE: 1, HOLIDAY: 1 } },
      availabilitySummary: { byAvailability: { ALL_DAY: 2 } },
      averageHolidayDaysPerSoldier: 1,
      administrativeActiveDays: 1,
    }

    queryClient.setQueryData(activityPersonnelStatusMatrixQueryKey('activity-1'), initialMatrix)
    queryClient.setQueryData(activityOverviewQueryKey('activity-1'), initialOverview)

    let resolveCreate: (value: unknown) => void
    createActivityUserStatusMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve
        }),
    )

    const { result } = renderHook(() => useCreateActivityUserStatus('activity-1'), {
      wrapper: createWrapper(queryClient),
    })

    const mutationPromise = result.current.mutateAsync({ userId: 'user-2', date: '2026-08-11', status: 'SICK' })

    await waitFor(() => {
      expect(queryClient.getQueryData(activityPersonnelStatusMatrixQueryKey('activity-1'))).toMatchObject({
        rows: [
          expect.objectContaining({
            user: expect.objectContaining({ id: 'user-2' }),
            cells: expect.objectContaining({
              '2026-08-10': 'ACTIVE',
              '2026-08-11': 'SICK',
              '2026-08-12': 'HOLIDAY',
            }),
            summary: expect.objectContaining({ activeCount: 1, holidayCount: 0, sickCount: 1, releasedCount: 0, yamam: 2 }),
          }),
        ],
        dailySummary: expect.arrayContaining([
          expect.objectContaining({ date: '2026-08-11', activeCount: 0, holidayCount: 0, sickCount: 1, releasedCount: 0, yamam: 1 }),
        ]),
      })
    })

    resolveCreate!( { id: 'status-1' } as never)
    await mutationPromise

    expect(createActivityUserStatusMock).toHaveBeenCalledWith('activity-1', 'user-2', {
      date: '2026-08-11',
      status: 'SICK',
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['activities', 'activity-1', 'overview'] })
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ['activities', 'activity-1', 'personnel-status-matrix'] })
  })

  it('create mutation rolls back the matrix cache on api failure', async () => {
    const queryClient = createQueryClient()

    useAuthSessionMock.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)

    const initialMatrix = {
      activity: { id: 'activity-1', name: 'Ops', companyId: 'company-1', startDate: '2026-08-10', endDate: '2026-08-12' },
      dates: ['2026-08-10', '2026-08-11', '2026-08-12'],
      rows: [
        {
          user: { id: 'user-2', firstName: 'Bob', lastName: 'Jones', email: 'bob@example.com' },
          cells: {
            '2026-08-10': 'ACTIVE',
            '2026-08-11': null,
            '2026-08-12': 'HOLIDAY',
          },
          summary: { activeCount: 1, holidayCount: 0, sickCount: 0, releasedCount: 0, yamam: 1, complete: false },
        },
      ],
      dailySummary: [
        { date: '2026-08-10', activeCount: 1, holidayCount: 0, sickCount: 0, releasedCount: 0, yamam: 1 },
        { date: '2026-08-11', activeCount: 0, holidayCount: 0, sickCount: 0, releasedCount: 0, yamam: 0 },
        { date: '2026-08-12', activeCount: 0, holidayCount: 1, sickCount: 0, releasedCount: 0, yamam: 1 },
      ],
    }

    queryClient.setQueryData(activityPersonnelStatusMatrixQueryKey('activity-1'), initialMatrix)
    createActivityUserStatusMock.mockRejectedValueOnce(new Error('boom'))

    const { result } = renderHook(() => useCreateActivityUserStatus('activity-1'), {
      wrapper: createWrapper(queryClient),
    })

    await expect(
      result.current.mutateAsync({ userId: 'user-2', date: '2026-08-11', status: 'SICK' }),
    ).rejects.toThrow('boom')

    expect(queryClient.getQueryData(activityPersonnelStatusMatrixQueryKey('activity-1'))).toEqual(initialMatrix)
  })

  it('update mutation rolls back matrix cache on failure', async () => {
    const queryClient = createQueryClient()

    useAuthSessionMock.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)

    const initialMatrix = {
      activity: { id: 'activity-1', name: 'Ops', companyId: 'company-1', startDate: '2026-08-10', endDate: '2026-08-12' },
      dates: ['2026-08-10', '2026-08-11', '2026-08-12'],
      rows: [
        {
          user: { id: 'user-2', firstName: 'Bob', lastName: 'Jones', email: 'bob@example.com' },
          cells: {
            '2026-08-10': 'ACTIVE',
            '2026-08-11': 'SICK',
            '2026-08-12': 'HOLIDAY',
          },
          summary: { activeCount: 1, holidayCount: 0, sickCount: 1, releasedCount: 0, yamam: 2, complete: false },
        },
      ],
      dailySummary: [
        { date: '2026-08-10', activeCount: 1, holidayCount: 0, sickCount: 0, releasedCount: 0, yamam: 1 },
        { date: '2026-08-11', activeCount: 0, holidayCount: 0, sickCount: 1, releasedCount: 0, yamam: 1 },
        { date: '2026-08-12', activeCount: 0, holidayCount: 1, sickCount: 0, releasedCount: 0, yamam: 1 },
      ],
    }

    queryClient.setQueryData(activityPersonnelStatusMatrixQueryKey('activity-1'), initialMatrix)
    updateActivityUserStatusMock.mockRejectedValueOnce(new Error('update failed'))

    const { result } = renderHook(() => useUpdateActivityUserStatus('activity-1'), {
      wrapper: createWrapper(queryClient),
    })

    await expect(
      result.current.mutateAsync({ userId: 'user-2', date: '2026-08-11', status: 'HOLIDAY' }),
    ).rejects.toThrow('update failed')

    expect(queryClient.getQueryData(activityPersonnelStatusMatrixQueryKey('activity-1'))).toEqual(initialMatrix)
  })

  it('delete mutation rolls back status and summary when api fails', async () => {
    const queryClient = createQueryClient()

    useAuthSessionMock.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)

    const initialMatrix = {
      activity: { id: 'activity-1', name: 'Ops', companyId: 'company-1', startDate: '2026-08-10', endDate: '2026-08-12' },
      dates: ['2026-08-10', '2026-08-11', '2026-08-12'],
      rows: [
        {
          user: { id: 'user-2', firstName: 'Bob', lastName: 'Jones', email: 'bob@example.com' },
          cells: {
            '2026-08-10': 'ACTIVE',
            '2026-08-11': 'SICK',
            '2026-08-12': 'HOLIDAY',
          },
          summary: { activeCount: 1, holidayCount: 0, sickCount: 1, releasedCount: 0, yamam: 2, complete: false },
        },
      ],
      dailySummary: [
        { date: '2026-08-10', activeCount: 1, holidayCount: 0, sickCount: 0, releasedCount: 0, yamam: 1 },
        { date: '2026-08-11', activeCount: 0, holidayCount: 0, sickCount: 1, releasedCount: 0, yamam: 1 },
        { date: '2026-08-12', activeCount: 0, holidayCount: 1, sickCount: 0, releasedCount: 0, yamam: 1 },
      ],
    }

    queryClient.setQueryData(activityPersonnelStatusMatrixQueryKey('activity-1'), initialMatrix)
    deleteActivityUserStatusMock.mockRejectedValueOnce(new Error('delete failed'))

    const { result } = renderHook(() => useDeleteActivityUserStatus('activity-1'), {
      wrapper: createWrapper(queryClient),
    })

    await expect(
      result.current.mutateAsync({ userId: 'user-2', date: '2026-08-11' }),
    ).rejects.toThrow('delete failed')

    expect(queryClient.getQueryData(activityPersonnelStatusMatrixQueryKey('activity-1'))).toEqual(initialMatrix)
  })

  it('create mutation invalidates list and detail caches', async () => {
    const queryClient = createQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    useAuthSessionMock.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)

    postCompanyActivityMock.mockResolvedValueOnce({
      id: 'activity-10',
      companyId: 'company-1',
      name: 'Ops',
      startDate: '2026-08-13',
      endDate: '2026-08-14',
      status: 'DRAFT',
      createdAt: '2026-08-13T00:00:00.000Z',
      updatedAt: '2026-08-13T00:00:00.000Z',
    })

    const { result } = renderHook(() => useCreateActivity(), {
      wrapper: createWrapper(queryClient),
    })

    await result.current.mutateAsync({
      name: 'Ops',
      startDate: '2026-08-13',
      endDate: '2026-08-14',
    })

    expect(postCompanyActivityMock).toHaveBeenCalledWith('company-1', {
      name: 'Ops',
      startDate: '2026-08-13',
      endDate: '2026-08-14',
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['companies', 'company-1', 'activities'],
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['activities', 'activity-10'],
    })
  })

  it('update mutation invalidates company list and activity detail caches', async () => {
    const queryClient = createQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    useAuthSessionMock.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)

    patchActivityMock.mockResolvedValueOnce({
      id: 'activity-20',
      companyId: 'company-1',
      name: 'Ops updated',
      startDate: '2026-08-13',
      endDate: '2026-08-15',
      status: 'ACTIVE',
      createdAt: '2026-08-13T00:00:00.000Z',
      updatedAt: '2026-08-14T00:00:00.000Z',
    })

    const { result } = renderHook(() => useUpdateActivity(), {
      wrapper: createWrapper(queryClient),
    })

    await result.current.mutateAsync({
      activityId: 'activity-20',
      body: { status: 'ACTIVE' },
    })

    expect(patchActivityMock).toHaveBeenCalledWith('activity-20', { status: 'ACTIVE' })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['companies', 'company-1', 'activities'],
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['activities', 'activity-20'],
    })
  })

  it('create mutation fails without company scope', async () => {
    useAuthSessionMock.mockReturnValue({
      isAuthenticated: false,
      user: null,
    } as ReturnType<typeof useAuthSession>)

    const { result } = renderHook(() => useCreateActivity(), {
      wrapper: createWrapper(createQueryClient()),
    })

    await expect(
      result.current.mutateAsync({
        name: 'Ops',
        startDate: '2026-08-13',
        endDate: '2026-08-14',
      }),
    ).rejects.toThrow('Cannot mutate activities without an authenticated company context.')

    expect(postCompanyActivityMock).not.toHaveBeenCalled()
  })
})
