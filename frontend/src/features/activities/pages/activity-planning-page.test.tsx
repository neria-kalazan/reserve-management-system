import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/activities/queries/use-activities', () => ({
  useActivityById: vi.fn(),
}))

vi.mock('@/features/activities/queries/use-activity-scheduling-day', () => ({
  useActivitySchedulingDay: vi.fn(),
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

import { useActivityById } from '@/features/activities/queries/use-activities'
import { useActivitySchedulingDay } from '@/features/activities/queries/use-activity-scheduling-day'
import { ActivityPlanningPage } from '@/features/activities/pages/activity-planning-page'

const useActivityByIdMock = vi.mocked(useActivityById)
const useActivitySchedulingDayMock = vi.mocked(useActivitySchedulingDay)

const activityData = {
  id: 'activity-1',
  companyId: 'company-1',
  name: 'פעילות מבצעית',
  startDate: '2026-08-10T00:00:00.000Z',
  endDate: '2026-08-15T00:00:00.000Z',
  status: 'ACTIVE',
  createdAt: '2026-08-10T00:00:00.000Z',
  updatedAt: '2026-08-10T00:00:00.000Z',
}

const baseTaskInstance = {
  id: 'instance-1',
  activityTaskId: 'task-1',
  activityTask: {
    id: 'task-1',
    name: 'הכנה',
    description: 'הכנת הצוות למשימה',
  },
  title: 'משמרת בוקר',
  startTime: '2026-08-11T08:00:00.000Z',
  endTime: '2026-08-11T12:00:00.000Z',
  isOvernight: false,
  requirements: {
    manpower: { required: true, quantity: 2 },
    roles: [{ roleId: 'role-1', roleName: 'חובש', required: true, quantity: 1 }],
    qualifications: [{ qualificationId: 'qual-1', qualificationName: 'ירי', required: false, quantity: 1 }],
  },
  assignmentSlots: {
    total: 2,
    filled: 1,
    unfilled: 1,
  },
  assignments: [
    {
      id: 'assignment-1',
      taskInstanceId: 'instance-1',
      userId: 'user-1',
      createdBy: null,
      createdAt: '2026-08-11T06:00:00.000Z',
      updatedAt: '2026-08-11T06:00:00.000Z',
      user: {
        id: 'user-1',
        firstName: 'איילה',
        lastName: 'כהן',
        personalNumber: '123456',
        phone: '0500000000',
        email: 'a@example.com',
        isActive: true,
        unit: { id: 'unit-1', name: 'א׳' },
      },
      availability: {
        status: 'ACTIVE',
        availability: 'ALL_DAY',
      },
      evaluation: {
        userId: 'user-1',
        severity: 'WARNING',
        reasonCodes: ['MISSING_REQUIRED_QUALIFICATION'],
        reasonMessages: ['חסרה הסמכה נדרשת'],
      },
    },
  ],
  validation: {
    requiredErrors: [{ type: 'MANPOWER', message: 'חסר כוח אדם' }],
    warnings: [{ type: 'AVAILABILITY', message: 'זמינות חלקית' }],
    summary: { isValid: false },
  },
}

const buildSchedulingDayData = (
  date: string,
  isDayOpened: boolean,
  taskInstances: any[] = [],
) => ({
  activity: {
    id: 'activity-1',
    companyId: 'company-1',
    name: 'פעילות מבצעית',
    status: 'ACTIVE',
    startDate: '2026-08-10T00:00:00.000Z',
    endDate: '2026-08-15T00:00:00.000Z',
  },
  date,
  isDayOpened,
  taskInstances,
})

const makeSchedulingQuery = (overrides: Record<string, unknown> = {}) => ({
  isPending: false,
  isError: false,
  data: buildSchedulingDayData('2026-08-10', false),
  refetch: vi.fn(),
  ...overrides,
})

describe('ActivityPlanningPage', () => {
  beforeEach(() => {
    useActivityByIdMock.mockReset()
    useActivitySchedulingDayMock.mockReset()
    navigateMock.mockReset()
    useParamsMock.mockReset()

    useParamsMock.mockReturnValue({ activityId: 'activity-1' })
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: activityData,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityById>)

    useActivitySchedulingDayMock.mockImplementation((requestedActivityId, date) => {
      if (requestedActivityId !== 'activity-1' || !date) {
        return makeSchedulingQuery({ isPending: true, data: undefined }) as ReturnType<typeof useActivitySchedulingDay>
      }

      if (date === '2026-08-11') {
        return makeSchedulingQuery({
          data: buildSchedulingDayData(date, true, [
            baseTaskInstance,
            {
              ...baseTaskInstance,
              id: 'instance-2',
              title: 'משמרת לילה',
              startTime: '2026-08-11T22:00:00.000Z',
              endTime: '2026-08-12T04:00:00.000Z',
              isOvernight: true,
              assignmentSlots: { total: 1, filled: 0, unfilled: 1 },
              assignments: [],
              validation: {
                requiredErrors: [],
                warnings: [],
                summary: { isValid: true },
              },
            },
          ]),
        }) as ReturnType<typeof useActivitySchedulingDay>
      }

      if (date === '2026-08-12') {
        return makeSchedulingQuery({
          data: buildSchedulingDayData(date, true, []),
        }) as ReturnType<typeof useActivitySchedulingDay>
      }

      return makeSchedulingQuery({
        data: buildSchedulingDayData(date, false, []),
      }) as ReturnType<typeof useActivitySchedulingDay>
    })
  })

  it('initializes selected date to activity start date', async () => {
    render(<ActivityPlanningPage />)

    await waitFor(() => {
      expect(useActivitySchedulingDayMock).toHaveBeenLastCalledWith('activity-1', '2026-08-10')
    })

    expect(screen.getByTestId('planning-selected-date').textContent).toBe('10.08.2026')
  })

  it('keeps unopened-day state for closed day', () => {
    render(<ActivityPlanningPage />)

    expect(screen.getByText('היום עדיין לא נפתח')).toBeDefined()
  })

  it('renders opened day task instances as scheduling board cards', async () => {
    render(<ActivityPlanningPage />)

    fireEvent.click(screen.getByRole('button', { name: 'יום הבא' }))

    await waitFor(() => {
      expect(screen.getByText('משמרת בוקר')).toBeDefined()
    })

    expect(screen.getByText('משמרת לילה')).toBeDefined()
  })

  it('displays task title and time range for opened day instances', async () => {
    render(<ActivityPlanningPage />)

    fireEvent.click(screen.getByRole('button', { name: 'יום הבא' }))

    await waitFor(() => {
      expect(screen.getAllByText('התחלה').length).toBeGreaterThan(0)
    })

    expect(screen.getByText('08:00')).toBeDefined()
    expect(screen.getByText('12:00')).toBeDefined()
  })

  it('marks overnight task instances', async () => {
    render(<ActivityPlanningPage />)

    fireEvent.click(screen.getByRole('button', { name: 'יום הבא' }))

    await waitFor(() => {
      expect(screen.getByText('לילה')).toBeDefined()
    })
  })

  it('shows filled and unfilled assignment slots', async () => {
    render(<ActivityPlanningPage />)

    fireEvent.click(screen.getByRole('button', { name: 'יום הבא' }))

    await waitFor(() => {
      expect(screen.getByText('1 מאוישים / 2 תקנים')).toBeDefined()
    })

    expect(screen.getAllByText('פנויים: 1').length).toBeGreaterThan(0)
    expect(screen.getAllByText('פנוי').length).toBeGreaterThan(0)
    expect(screen.getAllByText('מאויש').length).toBeGreaterThan(0)
  })

  it('displays assigned soldiers from read model data', async () => {
    render(<ActivityPlanningPage />)

    fireEvent.click(screen.getByRole('button', { name: 'יום הבא' }))

    await waitFor(() => {
      expect(screen.getByText('איילה כהן')).toBeDefined()
    })

    expect(screen.getByText('מספר אישי: 123456')).toBeDefined()
    expect(screen.getByText('מסגרת: א׳')).toBeDefined()
  })

  it('displays requirements with required vs optional semantics', async () => {
    render(<ActivityPlanningPage />)

    fireEvent.click(screen.getByRole('button', { name: 'יום הבא' }))

    await waitFor(() => {
      expect(screen.getAllByText('דרישות').length).toBeGreaterThan(0)
    })

    expect(screen.getAllByText('כוח אדם').length).toBeGreaterThan(0)
    expect(screen.getAllByText('תפקידים').length).toBeGreaterThan(0)
    expect(screen.getAllByText('הסמכות').length).toBeGreaterThan(0)
    expect(screen.getAllByText('חובה').length).toBeGreaterThan(0)
    expect(screen.getAllByText('אופציונלי').length).toBeGreaterThan(0)
  })

  it('displays validation and warning information from response', async () => {
    render(<ActivityPlanningPage />)

    fireEvent.click(screen.getByRole('button', { name: 'יום הבא' }))

    await waitFor(() => {
      expect(screen.getByText('בעיות חובה')).toBeDefined()
    })

    expect(screen.getByText('חסר כוח אדם')).toBeDefined()
    expect(screen.getByText('אזהרות')).toBeDefined()
    expect(screen.getByText('זמינות חלקית')).toBeDefined()
  })

  it('shows empty state for opened day with zero task instances', async () => {
    render(<ActivityPlanningPage />)

    fireEvent.click(screen.getByRole('button', { name: 'יום הבא' }))
    fireEvent.click(screen.getByRole('button', { name: 'יום הבא' }))

    await waitFor(() => {
      expect(screen.getByText('אין מופעי משימה ליום פתוח זה')).toBeDefined()
    })
  })

  it('keeps existing day navigation behavior and refreshes query key args', async () => {
    render(<ActivityPlanningPage />)

    fireEvent.click(screen.getByRole('button', { name: 'יום הבא' }))
    await waitFor(() => {
      expect(useActivitySchedulingDayMock).toHaveBeenLastCalledWith('activity-1', '2026-08-11')
    })

    fireEvent.click(screen.getByRole('button', { name: 'יום קודם' }))
    await waitFor(() => {
      expect(useActivitySchedulingDayMock).toHaveBeenLastCalledWith('activity-1', '2026-08-10')
    })
  })

  it('does not allow navigation outside activity date range', async () => {
    render(<ActivityPlanningPage />)

    const previousButton = screen.getByRole('button', { name: 'יום קודם' })
    expect((previousButton as HTMLButtonElement).disabled).toBe(true)

    const nextButton = screen.getByRole('button', { name: 'יום הבא' })
    fireEvent.click(nextButton)
    fireEvent.click(nextButton)
    fireEvent.click(nextButton)
    fireEvent.click(nextButton)
    fireEvent.click(nextButton)

    await waitFor(() => {
      expect(useActivitySchedulingDayMock).toHaveBeenLastCalledWith('activity-1', '2026-08-15')
    })

    expect((nextButton as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(nextButton)

    await waitFor(() => {
      expect(useActivitySchedulingDayMock).toHaveBeenLastCalledWith('activity-1', '2026-08-15')
    })
  })

  it('renders scheduling-day error state with retry action', () => {
    const refetch = vi.fn()
    useActivitySchedulingDayMock.mockReturnValue(
      makeSchedulingQuery({
        isError: true,
        error: { status: 500, message: 'failed' },
        refetch,
      }) as ReturnType<typeof useActivitySchedulingDay>,
    )

    render(<ActivityPlanningPage />)

    expect(screen.getByText('טעינת יום השיבוץ נכשלה')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'ניסיון חוזר' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('keeps existing planning navigation behavior to activity details route', () => {
    render(<ActivityPlanningPage />)

    fireEvent.click(screen.getByRole('button', { name: 'חזרה לפרטי הפעילות' }))
    expect(navigateMock).toHaveBeenCalledWith('/activities/activity-1')
  })
})
