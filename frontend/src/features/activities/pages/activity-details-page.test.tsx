import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/activities/queries/use-activities', () => ({
  useActivityById: vi.fn(),
  useActivityOverview: vi.fn(),
}))

const { navigateMock, useParamsMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  useParamsMock: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: useParamsMock,
  }
})

import { useActivityById, useActivityOverview } from '@/features/activities/queries/use-activities'
import { ActivityDetailsPage } from '@/features/activities/pages/activity-details-page'

const useActivityByIdMock = vi.mocked(useActivityById)
const useActivityOverviewMock = vi.mocked(useActivityOverview)

describe('ActivityDetailsPage', () => {
  beforeEach(() => {
    useActivityByIdMock.mockReset()
    useActivityOverviewMock.mockReset()
    navigateMock.mockReset()
    useParamsMock.mockReset()
    useParamsMock.mockReturnValue({ activityId: 'activity-1' })
    useActivityOverviewMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityOverview>)
  })

  it('renders loading state', () => {
    useActivityByIdMock.mockReturnValue({ isPending: true } as ReturnType<typeof useActivityById>)

    render(<ActivityDetailsPage />)

    expect(screen.getByText('טוען פרטי תעסוקה')).toBeDefined()
  })

  it('renders error state and supports retry + back navigation', () => {
    const refetch = vi.fn()
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: true,
      error: { status: 500, message: 'failed' },
      refetch,
    } as unknown as ReturnType<typeof useActivityById>)

    render(<ActivityDetailsPage />)

    expect(screen.getByText('טעינת פרטי התעסוקה נכשלה')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'ניסיון חוזר' }))
    expect(refetch).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'חזרה לתעסוקות' }))
    expect(navigateMock).toHaveBeenCalledWith('/activities')
  })

  it('renders not-found messaging when API returns 404', () => {
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: true,
      error: { status: 404, message: 'not found' },
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityById>)

    render(<ActivityDetailsPage />)

    expect(screen.getByText('התעסוקה לא נמצאה')).toBeDefined()
    expect(screen.getByText('לא נמצאה תעסוקה עם המזהה שנבחר. אפשר לחזור לרשימת התעסוקות.')).toBeDefined()
  })

  it('renders overview loading state without hiding the activity details', () => {
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        id: 'activity-1',
        companyId: 'company-1',
        name: 'תעסוקה מבצעית',
        startDate: '2026-08-10T00:00:00.000Z',
        endDate: '2026-08-15T00:00:00.000Z',
        status: 'ACTIVE',
        createdAt: '2026-08-10T00:00:00.000Z',
        updatedAt: '2026-08-10T00:00:00.000Z',
      },
    } as unknown as ReturnType<typeof useActivityById>)
    useActivityOverviewMock.mockReturnValue({
      isPending: true,
      isError: false,
      data: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityOverview>)

    render(<ActivityDetailsPage />)

    expect(screen.getAllByText('תעסוקה מבצעית').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('סקירה')).toBeDefined()
    expect(screen.getByText('טוען סקירה')).toBeDefined()
  })

  it('renders overview summary data and keeps activity details visible', () => {
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        id: 'activity-1',
        companyId: 'company-1',
        name: 'תעסוקה מבצעית',
        startDate: '2026-08-10T00:00:00.000Z',
        endDate: '2026-08-15T00:00:00.000Z',
        status: 'ACTIVE',
        createdAt: '2026-08-10T00:00:00.000Z',
        updatedAt: '2026-08-10T00:00:00.000Z',
      },
    } as unknown as ReturnType<typeof useActivityById>)
    useActivityOverviewMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        activity: { id: 'activity-1', name: 'תעסוקה מבצעית', status: 'ACTIVE' },
        manpowerSummary: { participantCount: 6, dailyStatusSummary: { ACTIVE: 5, HOLIDAY: 1 } },
        tasksOverview: [
          {
            taskId: 'task-1',
            taskName: 'הכנה',
            assignmentSummary: { totalAssignments: 3, assignedTaskInstances: 2, unassignedTaskInstances: 1 },
            validationSummary: { requiredErrorCount: 1, warningCount: 2 },
          },
        ],
        availabilitySummary: { byAvailability: { ALL_DAY: 3, MORNING: 2 } },
      },
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityOverview>)

    render(<ActivityDetailsPage />)

    expect(screen.getAllByText('תעסוקה מבצעית').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('כוח אדם')).toBeDefined()
    expect(screen.getByText('6')).toBeDefined()
    expect(screen.getByText('הכנה')).toBeDefined()
    expect(screen.getByText('אימות')).toBeDefined()
  })

  it('renders overview error state with retry when the overview request fails', () => {
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        id: 'activity-1',
        companyId: 'company-1',
        name: 'תעסוקה מבצעית',
        startDate: '2026-08-10T00:00:00.000Z',
        endDate: '2026-08-15T00:00:00.000Z',
        status: 'ACTIVE',
        createdAt: '2026-08-10T00:00:00.000Z',
        updatedAt: '2026-08-10T00:00:00.000Z',
      },
    } as unknown as ReturnType<typeof useActivityById>)

    const refetch = vi.fn()
    useActivityOverviewMock.mockReturnValue({
      isPending: false,
      isError: true,
      error: { status: 500, message: 'failed' },
      refetch,
    } as unknown as ReturnType<typeof useActivityOverview>)

    render(<ActivityDetailsPage />)

    expect(screen.getByText('טעינת סקירה נכשלה')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'ניסיון חוזר' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('navigates back to activities list from header action', () => {
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        id: 'activity-1',
        companyId: 'company-1',
        name: 'תעסוקה מבצעית',
        startDate: '2026-08-10T00:00:00.000Z',
        endDate: '2026-08-15T00:00:00.000Z',
        status: 'ACTIVE',
        createdAt: '2026-08-10T00:00:00.000Z',
        updatedAt: '2026-08-10T00:00:00.000Z',
      },
    } as unknown as ReturnType<typeof useActivityById>)

    render(<ActivityDetailsPage />)

    fireEvent.click(screen.getByRole('button', { name: 'חזרה לתעסוקות' }))
    expect(navigateMock).toHaveBeenCalledWith('/activities')
  })

  it('handles missing activityId route param safely', () => {
    useParamsMock.mockReturnValue({})
    useActivityByIdMock.mockReturnValue({ isPending: false } as ReturnType<typeof useActivityById>)

    render(<ActivityDetailsPage />)

    expect(screen.getByText('מזהה תעסוקה חסר')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'חזרה לרשימת תעסוקות' }))
    expect(navigateMock).toHaveBeenCalledWith('/activities')
  })
})
