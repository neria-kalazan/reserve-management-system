import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/activities/queries/use-activities', () => ({
  useActivityById: vi.fn(),
  useActivityOverview: vi.fn(),
}))

vi.mock('@/features/activities/queries/use-activity-tasks', () => ({
  useActivityTasks: vi.fn(),
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
import { useActivityTasks } from '@/features/activities/queries/use-activity-tasks'
import { ActivityDetailsPage } from '@/features/activities/pages/activity-details-page'

const useActivityByIdMock = vi.mocked(useActivityById)
const useActivityOverviewMock = vi.mocked(useActivityOverview)
const useActivityTasksMock = vi.mocked(useActivityTasks)

describe('ActivityDetailsPage', () => {
  beforeEach(() => {
    useActivityByIdMock.mockReset()
    useActivityOverviewMock.mockReset()
    useActivityTasksMock.mockReset()
    navigateMock.mockReset()
    useParamsMock.mockReset()
    useParamsMock.mockReturnValue({ activityId: 'activity-1' })
    useActivityOverviewMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityOverview>)
    useActivityTasksMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityTasks>)
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
        startDate: '2099-08-10T00:00:00.000Z',
        endDate: '2099-08-15T00:00:00.000Z',
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
        startDate: '2099-08-10T00:00:00.000Z',
        endDate: '2099-08-15T00:00:00.000Z',
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

  it.each([
    ['TRAINING', 'אימון'],
    ['EMPLOYMENT', 'תעסוקה'],
    ['TRAINING_COURSE', 'השתלמות'],
  ] as const)('renders activity type label %s', (type, label) => {
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        id: 'activity-1',
        companyId: 'company-1',
        name: 'תעסוקה מבצעית',
        type,
        startDate: '2099-08-10T00:00:00.000Z',
        endDate: '2099-08-15T00:00:00.000Z',
        status: 'ACTIVE',
        createdAt: '2026-08-10T00:00:00.000Z',
        updatedAt: '2026-08-10T00:00:00.000Z',
      },
    } as unknown as ReturnType<typeof useActivityById>)

    render(<ActivityDetailsPage />)

    expect(screen.getByText('סוג הפעילות')).toBeDefined()
    expect(screen.getByText(label)).toBeDefined()
  })

  it('keeps operational UI for active activity', () => {
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        id: 'activity-1',
        companyId: 'company-1',
        name: 'תעסוקה מבצעית',
        type: 'EMPLOYMENT',
        startDate: '2099-08-10T00:00:00.000Z',
        endDate: '2099-08-15T00:00:00.000Z',
        status: 'ACTIVE',
        createdAt: '2026-08-10T00:00:00.000Z',
        updatedAt: '2026-08-10T00:00:00.000Z',
      },
    } as unknown as ReturnType<typeof useActivityById>)

    render(<ActivityDetailsPage />)

    expect(screen.getByRole('button', { name: 'תכנון תפעולי' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'זמינות' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'עריכת תעסוקה' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'טבלת שיבוץ' })).toBeNull()
  })

  it('keeps operational UI for planned activity', () => {
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        id: 'activity-1',
        companyId: 'company-1',
        name: 'תעסוקה עתידית',
        type: 'TRAINING',
        startDate: '2099-08-10T00:00:00.000Z',
        endDate: '2099-08-15T00:00:00.000Z',
        status: 'DRAFT',
        createdAt: '2026-08-10T00:00:00.000Z',
        updatedAt: '2026-08-10T00:00:00.000Z',
      },
    } as unknown as ReturnType<typeof useActivityById>)

    render(<ActivityDetailsPage />)

    expect(screen.getByRole('button', { name: 'תכנון תפעולי' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'זמינות' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'עריכת תעסוקה' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'טבלת שיבוץ' })).toBeNull()
  })

  it.each(['COMPLETED', 'CANCELLED'] as const)('renders historical layout for %s activity', (status) => {
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        id: 'activity-1',
        companyId: 'company-1',
        name: 'תעסוקה היסטורית',
        type: 'EMPLOYMENT',
        startDate: '2026-07-01T00:00:00.000Z',
        endDate: '2026-07-05T00:00:00.000Z',
        status,
        createdAt: '2026-08-10T00:00:00.000Z',
        updatedAt: '2026-08-10T00:00:00.000Z',
      },
    } as unknown as ReturnType<typeof useActivityById>)

    render(<ActivityDetailsPage />)

    expect(screen.getByText('פרטי פעילות היסטורית')).toBeDefined()
    expect(screen.getByRole('button', { name: 'טבלת שיבוץ' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'טבלת נוכחות' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'עריכת תעסוקה' })).toBeDefined()
    expect(screen.getByText('שכר יומיים')).toBeDefined()
    expect(screen.getByText('אין נתונים להצגה')).toBeDefined()
    expect(screen.queryByRole('button', { name: 'תכנון תפעולי' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'זמינות' })).toBeNull()
  })

  it('renders historical layout for ended activity', () => {
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        id: 'activity-1',
        companyId: 'company-1',
        name: 'תעסוקה שהסתיימה',
        type: 'TRAINING_COURSE',
        startDate: '2025-01-01T00:00:00.000Z',
        endDate: '2025-01-02T00:00:00.000Z',
        status: 'ACTIVE',
        createdAt: '2026-08-10T00:00:00.000Z',
        updatedAt: '2026-08-10T00:00:00.000Z',
      },
    } as unknown as ReturnType<typeof useActivityById>)

    render(<ActivityDetailsPage />)

    expect(screen.getByText('פרטי פעילות היסטורית')).toBeDefined()
    expect(screen.getByRole('button', { name: 'טבלת שיבוץ' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'טבלת נוכחות' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'עריכת תעסוקה' })).toBeDefined()
    expect(screen.getByText('שכר יומיים')).toBeDefined()
    expect(screen.getByText('אין נתונים להצגה')).toBeDefined()
  })

  it('logs assignment placeholder without navigation', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        id: 'activity-1',
        companyId: 'company-1',
        name: 'תעסוקה היסטורית',
        type: 'EMPLOYMENT',
        startDate: '2026-07-01T00:00:00.000Z',
        endDate: '2026-07-05T00:00:00.000Z',
        status: 'COMPLETED',
        createdAt: '2026-08-10T00:00:00.000Z',
        updatedAt: '2026-08-10T00:00:00.000Z',
      },
    } as unknown as ReturnType<typeof useActivityById>)

    render(<ActivityDetailsPage />)

    fireEvent.click(screen.getByRole('button', { name: 'טבלת שיבוץ' }))

    expect(consoleSpy).toHaveBeenCalledWith('טבלת שיבוץ — טרם מומש')
    expect(navigateMock).not.toHaveBeenCalledWith('/activities/1')
    consoleSpy.mockRestore()
  })

  it('logs attendance placeholder without navigation', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        id: 'activity-1',
        companyId: 'company-1',
        name: 'תעסוקה היסטורית',
        type: 'EMPLOYMENT',
        startDate: '2026-07-01T00:00:00.000Z',
        endDate: '2026-07-05T00:00:00.000Z',
        status: 'COMPLETED',
        createdAt: '2026-08-10T00:00:00.000Z',
        updatedAt: '2026-08-10T00:00:00.000Z',
      },
    } as unknown as ReturnType<typeof useActivityById>)

    render(<ActivityDetailsPage />)

    fireEvent.click(screen.getByRole('button', { name: 'טבלת נוכחות' }))

    expect(consoleSpy).toHaveBeenCalledWith('טבלת נוכחות — טרם מומש')
    consoleSpy.mockRestore()
  })

  it('renders read-only task list scoped to the activity', () => {
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        id: 'activity-1',
        companyId: 'company-1',
        name: 'תעסוקה מבצעית',
        type: 'EMPLOYMENT',
        startDate: '2099-08-10T00:00:00.000Z',
        endDate: '2099-08-15T00:00:00.000Z',
        status: 'ACTIVE',
        createdAt: '2026-08-10T00:00:00.000Z',
        updatedAt: '2026-08-10T00:00:00.000Z',
      },
    } as unknown as ReturnType<typeof useActivityById>)
    useActivityTasksMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [
        { id: 'task-1', activityId: 'activity-1', name: 'הכנה', description: 'תיאור קצר' },
        { id: 'task-2', activityId: 'activity-1', name: 'סיור', description: null },
      ],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityTasks>)

    render(<ActivityDetailsPage />)

    expect(screen.getByText('משימות')).toBeDefined()
    expect(screen.getByText('הכנה')).toBeDefined()
    expect(screen.getByText('סיור')).toBeDefined()
  })

  it('renders historical administrative metrics for historical activities', () => {
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        id: 'activity-1',
        companyId: 'company-1',
        name: 'תעסוקה היסטורית',
        type: 'EMPLOYMENT',
        startDate: '2026-07-01T00:00:00.000Z',
        endDate: '2026-07-05T00:00:00.000Z',
        status: 'COMPLETED',
        createdAt: '2026-08-10T00:00:00.000Z',
        updatedAt: '2026-08-10T00:00:00.000Z',
      },
    } as unknown as ReturnType<typeof useActivityById>)
    useActivityOverviewMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        activity: { id: 'activity-1', name: 'תעסוקה היסטורית', status: 'COMPLETED' },
        manpowerSummary: { participantCount: 3, dailyStatusSummary: { ACTIVE: 2, HOLIDAY: 6 } },
        tasksOverview: [],
        availabilitySummary: { byAvailability: { ALL_DAY: 3 } },
        averageHolidayDaysPerSoldier: 2,
        administrativeActiveDays: 2,
      },
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityOverview>)

    render(<ActivityDetailsPage />)

    expect(screen.getByText('ממוצע ימי חופשה ליחיד')).toBeDefined()
    expect(screen.getByText('2')).toBeDefined()
    expect(screen.getByText('ימי פעילות שלישותיים')).toBeDefined()
    expect(screen.getByText('2')).toBeDefined()
  })

  it('does not display historical metrics on planned or active activities', () => {
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        id: 'activity-1',
        companyId: 'company-1',
        name: 'תעסוקה מבצעית',
        type: 'EMPLOYMENT',
        startDate: '2099-08-10T00:00:00.000Z',
        endDate: '2099-08-15T00:00:00.000Z',
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
        manpowerSummary: { participantCount: 3, dailyStatusSummary: { ACTIVE: 2, HOLIDAY: 6 } },
        tasksOverview: [],
        availabilitySummary: { byAvailability: { ALL_DAY: 3 } },
        averageHolidayDaysPerSoldier: 2,
        administrativeActiveDays: 2,
      },
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityOverview>)

    render(<ActivityDetailsPage />)

    expect(screen.queryByText('ממוצע ימי חופשה ליחיד')).toBeNull()
    expect(screen.queryByText('ימי פעילות שלישותיים')).toBeNull()
  })

  it('renders overview error state with retry when the overview request fails', () => {
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        id: 'activity-1',
        companyId: 'company-1',
        name: 'תעסוקה מבצעית',
        type: 'EMPLOYMENT',
        startDate: '2099-08-10T00:00:00.000Z',
        endDate: '2099-08-15T00:00:00.000Z',
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
        type: 'EMPLOYMENT',
        startDate: '2099-08-10T00:00:00.000Z',
        endDate: '2099-08-15T00:00:00.000Z',
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
