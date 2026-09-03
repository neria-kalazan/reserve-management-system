import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/app/auth/use-auth-session', () => ({
  useAuthSession: vi.fn(),
}))

vi.mock('@/features/activities/api/scheduling-day', () => ({
  approveActivitySchedulingDay: vi.fn(),
  getActivitySchedulingDay: vi.fn(),
  openActivitySchedulingDay: vi.fn(),
  returnActivitySchedulingDayToDraft: vi.fn(),
  submitActivitySchedulingDayForApproval: vi.fn(),
}))

import { useAuthSession } from '@/app/auth/use-auth-session'
import {
  approveActivitySchedulingDay,
  getActivitySchedulingDay,
  openActivitySchedulingDay,
  returnActivitySchedulingDayToDraft,
  submitActivitySchedulingDayForApproval,
} from '@/features/activities/api/scheduling-day'
import {
  activitySchedulingDayQueryKey,
  useApproveActivitySchedulingDay,
  useActivitySchedulingDay,
  useOpenActivitySchedulingDay,
  useReturnActivitySchedulingDayToDraft,
  useSubmitActivitySchedulingDayForApproval,
} from '@/features/activities/queries/use-activity-scheduling-day'

const approveActivitySchedulingDayMock = vi.mocked(approveActivitySchedulingDay)
const useAuthSessionMock = vi.mocked(useAuthSession)
const getActivitySchedulingDayMock = vi.mocked(getActivitySchedulingDay)
const openActivitySchedulingDayMock = vi.mocked(openActivitySchedulingDay)
const returnActivitySchedulingDayToDraftMock = vi.mocked(returnActivitySchedulingDayToDraft)
const submitActivitySchedulingDayForApprovalMock = vi.mocked(submitActivitySchedulingDayForApproval)

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

describe('useActivitySchedulingDay', () => {
  it('uses activityId and date in the query key', () => {
    expect(activitySchedulingDayQueryKey('activity-1', '2026-08-15')).toEqual([
      'activities',
      'activity-1',
      'scheduling',
      'day',
      '2026-08-15',
    ])
  })

  it('calls the scheduling day API with the provided activityId and date', async () => {
    useAuthSessionMock.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)

    getActivitySchedulingDayMock.mockResolvedValueOnce({
      activity: {
        id: 'activity-1',
        companyId: 'company-1',
        name: 'Daily Ops',
        status: 'ACTIVE',
        startDate: '2026-08-10T00:00:00.000Z',
        endDate: '2026-08-20T00:00:00.000Z',
      },
      date: '2026-08-15',
      isDayOpened: false,
      schedulingStatus: 'DRAFT',
      taskInstances: [],
    })

    const { result } = renderHook(() => useActivitySchedulingDay('activity-1', '2026-08-15'), {
      wrapper: createWrapper(createQueryClient()),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getActivitySchedulingDayMock).toHaveBeenCalledWith('activity-1', '2026-08-15')
  })

  it('does not query when activity id is missing', async () => {
    useAuthSessionMock.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)

    const { result } = renderHook(() => useActivitySchedulingDay(undefined, '2026-08-15'), {
      wrapper: createWrapper(createQueryClient()),
    })

    await waitFor(() => expect(result.current.fetchStatus).not.toBe('fetching'))
    expect(getActivitySchedulingDayMock).not.toHaveBeenCalled()
  })

  it('does not query when date is missing', async () => {
    useAuthSessionMock.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)

    const { result } = renderHook(() => useActivitySchedulingDay('activity-1', undefined), {
      wrapper: createWrapper(createQueryClient()),
    })

    await waitFor(() => expect(result.current.fetchStatus).not.toBe('fetching'))
    expect(getActivitySchedulingDayMock).not.toHaveBeenCalled()
  })

  it('does not query when the user is not authenticated', async () => {
    useAuthSessionMock.mockReturnValue({
      isAuthenticated: false,
      user: null,
    } as ReturnType<typeof useAuthSession>)

    const { result } = renderHook(() => useActivitySchedulingDay('activity-1', '2026-08-15'), {
      wrapper: createWrapper(createQueryClient()),
    })

    await waitFor(() => expect(result.current.fetchStatus).not.toBe('fetching'))
    expect(getActivitySchedulingDayMock).not.toHaveBeenCalled()
  })

  it('opens scheduling day and invalidates the exact activity/day query key', async () => {
    const queryClient = createQueryClient()
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    openActivitySchedulingDayMock.mockResolvedValueOnce({
      activityId: 'activity-1',
      date: '2026-08-15',
      isDayOpened: true,
    })

    const { result } = renderHook(() => useOpenActivitySchedulingDay('activity-1', '2026-08-15'), {
      wrapper: createWrapper(queryClient),
    })

    await result.current.mutateAsync()

    expect(openActivitySchedulingDayMock).toHaveBeenCalledWith('activity-1', {
      date: '2026-08-15',
    })
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['activities', 'activity-1', 'scheduling', 'day', '2026-08-15'],
    })
  })

  it('submits scheduling day for approval and invalidates the exact activity/day query key', async () => {
    const queryClient = createQueryClient()
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    submitActivitySchedulingDayForApprovalMock.mockResolvedValueOnce({
      activityId: 'activity-1',
      date: '2026-08-15',
      isDayOpened: true,
      schedulingStatus: 'PENDING_APPROVAL',
    })

    const { result } = renderHook(() => useSubmitActivitySchedulingDayForApproval('activity-1', '2026-08-15'), {
      wrapper: createWrapper(queryClient),
    })

    await result.current.mutateAsync()

    expect(submitActivitySchedulingDayForApprovalMock).toHaveBeenCalledWith('activity-1', {
      date: '2026-08-15',
    })
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['activities', 'activity-1', 'scheduling', 'day', '2026-08-15'],
    })
  })

  it('approves scheduling day and invalidates the exact activity/day query key', async () => {
    const queryClient = createQueryClient()
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    approveActivitySchedulingDayMock.mockResolvedValueOnce({
      activityId: 'activity-1',
      date: '2026-08-15',
      isDayOpened: true,
      schedulingStatus: 'APPROVED',
    })

    const { result } = renderHook(() => useApproveActivitySchedulingDay('activity-1', '2026-08-15'), {
      wrapper: createWrapper(queryClient),
    })

    await result.current.mutateAsync()

    expect(approveActivitySchedulingDayMock).toHaveBeenCalledWith('activity-1', {
      date: '2026-08-15',
    })
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['activities', 'activity-1', 'scheduling', 'day', '2026-08-15'],
    })
  })

  it('returns scheduling day to draft and invalidates the exact activity/day query key', async () => {
    const queryClient = createQueryClient()
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    returnActivitySchedulingDayToDraftMock.mockResolvedValueOnce({
      activityId: 'activity-1',
      date: '2026-08-15',
      isDayOpened: true,
      schedulingStatus: 'DRAFT',
    })

    const { result } = renderHook(() => useReturnActivitySchedulingDayToDraft('activity-1', '2026-08-15'), {
      wrapper: createWrapper(queryClient),
    })

    await result.current.mutateAsync()

    expect(returnActivitySchedulingDayToDraftMock).toHaveBeenCalledWith('activity-1', {
      date: '2026-08-15',
    })
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['activities', 'activity-1', 'scheduling', 'day', '2026-08-15'],
    })
  })
})
