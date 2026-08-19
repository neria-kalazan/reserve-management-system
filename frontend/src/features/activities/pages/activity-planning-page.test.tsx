import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/activities/queries/use-activities', () => ({
  useActivityById: vi.fn(),
  useActivityAvailability: vi.fn(),
}))

vi.mock('@/features/activities/queries/use-activity-tasks', () => ({
  useActivityTasks: vi.fn(),
  useActivityTaskInstances: vi.fn(),
  useTaskInstanceWorkspace: vi.fn(),
  useTaskInstanceValidation: vi.fn(),
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

import { useActivityAvailability, useActivityById } from '@/features/activities/queries/use-activities'
import {
  useActivityTaskInstances,
  useActivityTasks,
  useTaskInstanceValidation,
  useTaskInstanceWorkspace,
} from '@/features/activities/queries/use-activity-tasks'
import { ActivityPlanningPage } from '@/features/activities/pages/activity-planning-page'

const useActivityByIdMock = vi.mocked(useActivityById)
const useActivityAvailabilityMock = vi.mocked(useActivityAvailability)
const useActivityTasksMock = vi.mocked(useActivityTasks)
const useActivityTaskInstancesMock = vi.mocked(useActivityTaskInstances)
const useTaskInstanceWorkspaceMock = vi.mocked(useTaskInstanceWorkspace)
const useTaskInstanceValidationMock = vi.mocked(useTaskInstanceValidation)

describe('ActivityPlanningPage', () => {
  beforeEach(() => {
    useActivityByIdMock.mockReset()
    useActivityAvailabilityMock.mockReset()
    useActivityTasksMock.mockReset()
    useActivityTaskInstancesMock.mockReset()
    useTaskInstanceWorkspaceMock.mockReset()
    useTaskInstanceValidationMock.mockReset()
    navigateMock.mockReset()
    useParamsMock.mockReset()
    useParamsMock.mockReturnValue({ activityId: 'activity-1' })

    useActivityTasksMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityTasks>)

    useActivityTaskInstancesMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityTaskInstances>)

    useActivityAvailabilityMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityAvailability>)

    useTaskInstanceWorkspaceMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useTaskInstanceWorkspace>)

    useTaskInstanceValidationMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useTaskInstanceValidation>)
  })

  it('requests availability for the current activity and renders user/date/status/availability details', () => {
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
    } as ReturnType<typeof useActivityById>)

    useActivityAvailabilityMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [
        {
          id: 'availability-1',
          activityId: 'activity-1',
          userId: 'user-1',
          date: '2026-08-12T00:00:00.000Z',
          status: 'ACTIVE',
          availability: 'ALL_DAY',
          user: { id: 'user-1', firstName: 'אבי', lastName: 'כהן', isActive: true },
        },
        {
          id: 'availability-2',
          activityId: 'activity-1',
          userId: 'user-2',
          date: '2026-08-13T00:00:00.000Z',
          status: 'HOLIDAY',
          availability: 'EVENING',
          user: { id: 'user-2', firstName: 'נועה', lastName: 'לוי', isActive: false },
        },
      ],
    } as ReturnType<typeof useActivityAvailability>)

    useActivityTasksMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [{ id: 'task-1', activityId: 'activity-1', name: 'הכנה', description: null }],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityTasks>)

    useActivityTaskInstancesMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [{ id: 'instance-1', activityTaskId: 'task-1', title: 'משמרת בוקר', startTime: '2026-08-12T08:00:00.000Z', endTime: '2026-08-12T12:00:00.000Z' }],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityTaskInstances>)

    useTaskInstanceWorkspaceMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: { requirements: { manpower: { required: true, quantity: 2 } }, currentAssignments: [] },
    } as unknown as ReturnType<typeof useTaskInstanceWorkspace>)

    useTaskInstanceValidationMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: { requiredErrors: [], warnings: [], summary: { isValid: true } },
    } as unknown as ReturnType<typeof useTaskInstanceValidation>)

    render(<ActivityPlanningPage />)

    expect(useActivityAvailabilityMock).toHaveBeenCalledWith('activity-1')
    expect(screen.getByText('זמינות פעילות')).toBeDefined()
    expect(screen.getByText('אבי כהן')).toBeDefined()
    expect(screen.getByText('נועה לוי')).toBeDefined()
    expect(screen.getAllByText('12.08.2026').length).toBeGreaterThan(0)
    expect(screen.getAllByText('13.08.2026').length).toBeGreaterThan(0)
    expect(screen.getAllByText('פעיל').length).toBeGreaterThan(0)
    expect(screen.getAllByText('חופשה').length).toBeGreaterThan(0)
    expect(screen.getAllByText('כל היום').length).toBeGreaterThan(0)
    expect(screen.getAllByText('ערב').length).toBeGreaterThan(0)
  })

  it('renders loading, error, and empty states for activity availability without breaking planning content', () => {
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
    } as ReturnType<typeof useActivityById>)

    useActivityTasksMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [{ id: 'task-1', activityId: 'activity-1', name: 'הכנה', description: null }],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityTasks>)

    useActivityTaskInstancesMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [{ id: 'instance-1', activityTaskId: 'task-1', title: 'משמרת בוקר', startTime: '2026-08-12T08:00:00.000Z', endTime: '2026-08-12T12:00:00.000Z' }],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityTaskInstances>)

    useTaskInstanceWorkspaceMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: { requirements: { manpower: { required: true, quantity: 2 } }, currentAssignments: [] },
    } as unknown as ReturnType<typeof useTaskInstanceWorkspace>)

    useTaskInstanceValidationMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: { requiredErrors: [], warnings: [], summary: { isValid: true } },
    } as unknown as ReturnType<typeof useTaskInstanceValidation>)

    useActivityAvailabilityMock.mockReturnValue({
      isPending: true,
      isError: false,
      data: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityAvailability>)

    const { rerender } = render(<ActivityPlanningPage />)

    expect(screen.getByText('טוען זמינות פעילות')).toBeDefined()
    expect(screen.getByText('הכנה')).toBeDefined()

    useActivityAvailabilityMock.mockReturnValue({
      isPending: false,
      isError: true,
      data: undefined,
      error: { status: 500, message: 'failed' },
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityAvailability>)

    rerender(<ActivityPlanningPage />)
    expect(screen.getByText('טעינת זמינות הפעילות נכשלה')).toBeDefined()
    expect(screen.getByText('הכנה')).toBeDefined()

    useActivityAvailabilityMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityAvailability>)

    rerender(<ActivityPlanningPage />)
    expect(screen.getByText('אין נתוני זמינות להצגה')).toBeDefined()
    expect(screen.getByText('הכנה')).toBeDefined()
  })

  it('renders activity context, manpower coverage, validation state, and assigned users', () => {
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
    } as ReturnType<typeof useActivityById>)

    useActivityTasksMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [{ id: 'task-1', activityId: 'activity-1', name: 'הכנה', description: null }],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityTasks>)

    useActivityTaskInstancesMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [
        { id: 'instance-1', activityTaskId: 'task-1', title: 'משמרת בוקר', startTime: '2026-08-12T08:00:00.000Z', endTime: '2026-08-12T12:00:00.000Z' },
        { id: 'instance-2', activityTaskId: 'task-1', title: 'משמרת ערב', startTime: '2026-08-12T16:00:00.000Z', endTime: '2026-08-12T20:00:00.000Z' },
      ],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityTaskInstances>)

    useTaskInstanceWorkspaceMock.mockImplementation((taskInstanceId) => ({
      isPending: false,
      isError: false,
      data: taskInstanceId === 'instance-1'
        ? {
            requirements: { manpower: { required: true, quantity: 2 } },
            currentAssignments: [
              { assignmentId: 'assignment-1', userId: 'user-1', user: { id: 'user-1', firstName: 'אבי', lastName: 'כהן' } },
            ],
          }
        : {
            requirements: { manpower: { required: true, quantity: 1 } },
            currentAssignments: [],
          },
    }) as unknown as ReturnType<typeof useTaskInstanceWorkspace>)

    useTaskInstanceValidationMock.mockImplementation((taskInstanceId) => ({
      isPending: false,
      isError: false,
      data: taskInstanceId === 'instance-1'
        ? {
            requiredErrors: [{ type: 'MANPOWER', message: 'לא מספק חיילים' }],
            warnings: [],
            summary: { isValid: false },
          }
        : {
            requiredErrors: [],
            warnings: [{ type: 'AVAILABILITY', message: 'יש אזהרה זמינות' }],
            summary: { isValid: true },
          },
    }) as unknown as ReturnType<typeof useTaskInstanceValidation>)

    render(<ActivityPlanningPage />)

    expect(screen.getByText('תכנון תפעולי')).toBeDefined()
    expect(screen.getAllByText('תעסוקה מבצעית').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('הכנה').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('משמרת בוקר')).toBeDefined()
    expect(screen.getByText('משמרת ערב')).toBeDefined()
    expect(screen.getByText('דרוש: 2')).toBeDefined()
    expect(screen.getByText('מוקצים: 1')).toBeDefined()
    expect(screen.getAllByText('משובצים:').length).toBeGreaterThan(0)
    expect(screen.getByText('אבי כהן')).toBeDefined()
    expect(screen.getAllByText('מחסור בכוח אדם · 1 / 2').length).toBeGreaterThan(0)
    expect(screen.getByText('1 בעיה')).toBeDefined()
    expect(screen.getAllByRole('button', { name: 'שיבוץ' }).length).toBeGreaterThan(0)
  })

  it('navigates to the existing task-instance assignment route for each task instance', () => {
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
    } as ReturnType<typeof useActivityById>)

    useActivityTasksMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [{ id: 'task-1', activityId: 'activity-1', name: 'הכנה', description: null }],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityTasks>)

    useActivityTaskInstancesMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [{ id: 'instance-1', activityTaskId: 'task-1', title: 'משמרת בוקר', startTime: '2026-08-12T08:00:00.000Z', endTime: '2026-08-12T12:00:00.000Z' }],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityTaskInstances>)

    useTaskInstanceWorkspaceMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        requirements: { manpower: { required: true, quantity: 2 } },
        currentAssignments: [],
      },
    } as unknown as ReturnType<typeof useTaskInstanceWorkspace>)

    useTaskInstanceValidationMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        requiredErrors: [],
        warnings: [],
        summary: { isValid: true },
      },
    } as unknown as ReturnType<typeof useTaskInstanceValidation>)

    render(<ActivityPlanningPage />)

    fireEvent.click(screen.getByRole('button', { name: 'שיבוץ' }))
    expect(navigateMock).toHaveBeenCalledWith('/activities/activity-1/tasks/task-1/task-instances')
  })

  it('renders backend validation warnings and required errors with separate operational summaries', () => {
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
    } as ReturnType<typeof useActivityById>)

    useActivityTasksMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [{ id: 'task-1', activityId: 'activity-1', name: 'הכנה', description: null }],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityTasks>)

    useActivityTaskInstancesMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [{ id: 'instance-1', activityTaskId: 'task-1', title: 'משמרת בוקר', startTime: '2026-08-12T08:00:00.000Z', endTime: '2026-08-12T12:00:00.000Z' }],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityTaskInstances>)

    useTaskInstanceWorkspaceMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        requirements: { manpower: { required: true, quantity: 2 } },
        currentAssignments: [{ assignmentId: 'assignment-1', userId: 'user-1', user: { id: 'user-1', firstName: 'אבי', lastName: 'כהן' } }],
      },
    } as unknown as ReturnType<typeof useTaskInstanceWorkspace>)

    useTaskInstanceValidationMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        requiredErrors: [{ type: 'MANPOWER', message: 'חסרה כמות כוח האדם הנדרשת' }],
        warnings: [{ type: 'AVAILABILITY', message: 'חלק מהמשתמשים לא זמינים' }],
        summary: { isValid: false },
      },
    } as unknown as ReturnType<typeof useTaskInstanceValidation>)

    render(<ActivityPlanningPage />)

    expect(screen.getByText('מחסור בכוח אדם · 1 / 2')).toBeDefined()
    expect(screen.getByText('1 בעיה')).toBeDefined()
    expect(screen.getByText('חסרה כמות כוח האדם הנדרשת')).toBeDefined()
    expect(screen.getByText('חלק מהמשתמשים לא זמינים')).toBeDefined()
  })

  it('does not invent validation issues when backend validation data is unavailable', () => {
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
    } as ReturnType<typeof useActivityById>)

    useActivityTasksMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [{ id: 'task-1', activityId: 'activity-1', name: 'הכנה', description: null }],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityTasks>)

    useActivityTaskInstancesMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [{ id: 'instance-1', activityTaskId: 'task-1', title: 'משמרת בוקר', startTime: '2026-08-12T08:00:00.000Z', endTime: '2026-08-12T12:00:00.000Z' }],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityTaskInstances>)

    useTaskInstanceWorkspaceMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        requirements: { manpower: { required: true, quantity: 2 } },
        currentAssignments: [],
      },
    } as unknown as ReturnType<typeof useTaskInstanceWorkspace>)

    useTaskInstanceValidationMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: undefined,
    } as unknown as ReturnType<typeof useTaskInstanceValidation>)

    render(<ActivityPlanningPage />)

    expect(screen.getByText('מחסור בכוח אדם · 0 / 2')).toBeDefined()
    expect(screen.queryByText('1 בעיה')).toBeNull()
    expect(screen.queryByText('1 אזהרה')).toBeNull()
  })

  it('renders full and under-covered manpower states independently', () => {
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
    } as ReturnType<typeof useActivityById>)

    useActivityTasksMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [{ id: 'task-1', activityId: 'activity-1', name: 'הכנה', description: null }],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityTasks>)

    useActivityTaskInstancesMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [
        { id: 'instance-1', activityTaskId: 'task-1', title: 'משמרת בוקר', startTime: '2026-08-12T08:00:00.000Z', endTime: '2026-08-12T12:00:00.000Z' },
        { id: 'instance-2', activityTaskId: 'task-1', title: 'משמרת ערב', startTime: '2026-08-12T16:00:00.000Z', endTime: '2026-08-12T20:00:00.000Z' },
      ],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityTaskInstances>)

    useTaskInstanceWorkspaceMock.mockImplementation((taskInstanceId) => ({
      isPending: false,
      isError: false,
      data: taskInstanceId === 'instance-1'
        ? {
            requirements: { manpower: { required: true, quantity: 5 } },
            currentAssignments: [
              { assignmentId: 'assignment-1', userId: 'user-1', user: { id: 'user-1', firstName: 'אבי', lastName: 'כהן' } },
              { assignmentId: 'assignment-2', userId: 'user-2', user: { id: 'user-2', firstName: 'בר', lastName: 'אור' } },
              { assignmentId: 'assignment-3', userId: 'user-3', user: { id: 'user-3', firstName: 'גיא', lastName: 'לוי' } },
            ],
          }
        : {
            requirements: { manpower: { required: true, quantity: 3 } },
            currentAssignments: [
              { assignmentId: 'assignment-4', userId: 'user-4', user: { id: 'user-4', firstName: 'דנה', lastName: 'שמעוני' } },
              { assignmentId: 'assignment-5', userId: 'user-5', user: { id: 'user-5', firstName: 'הללי', lastName: 'מזרחי' } },
              { assignmentId: 'assignment-6', userId: 'user-6', user: { id: 'user-6', firstName: 'זוהר', lastName: 'נעמן' } },
            ],
          },
    }) as unknown as ReturnType<typeof useTaskInstanceWorkspace>)

    useTaskInstanceValidationMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        requiredErrors: [],
        warnings: [],
        summary: { isValid: true },
      },
    } as unknown as ReturnType<typeof useTaskInstanceValidation>)

    render(<ActivityPlanningPage />)

    expect(screen.getByText('מחסור בכוח אדם · 3 / 5')).toBeDefined()
    expect(screen.getByText('כיסוי מלא · 3 / 3')).toBeDefined()
  })

  it('renders neutral manpower state when manpower data is unavailable', () => {
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
    } as ReturnType<typeof useActivityById>)

    useActivityTasksMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [{ id: 'task-1', activityId: 'activity-1', name: 'הכנה', description: null }],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityTasks>)

    useActivityTaskInstancesMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [{ id: 'instance-1', activityTaskId: 'task-1', title: 'משמרת בוקר', startTime: '2026-08-12T08:00:00.000Z', endTime: '2026-08-12T12:00:00.000Z' }],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityTaskInstances>)

    useTaskInstanceWorkspaceMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        requirements: { manpower: null },
        currentAssignments: [],
      },
    } as unknown as ReturnType<typeof useTaskInstanceWorkspace>)

    useTaskInstanceValidationMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        requiredErrors: [],
        warnings: [],
        summary: { isValid: true },
      },
    } as unknown as ReturnType<typeof useTaskInstanceValidation>)

    render(<ActivityPlanningPage />)

    expect(screen.getByText('כוח אדם לא זמין · 0 / —')).toBeDefined()
    expect(screen.queryByText('0 / 0')).toBeNull()
  })

  it('renders loading and retry states', () => {
    useActivityByIdMock.mockReturnValue({
      isPending: true,
      isError: false,
      data: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityById>)

    render(<ActivityPlanningPage />)

    expect(screen.getByText('טוען תכנון תפעולי')).toBeDefined()
  })

  it('renders an error state with retry', () => {
    const refetch = vi.fn()
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: true,
      error: { status: 500, message: 'failed' },
      data: undefined,
      refetch,
    } as unknown as ReturnType<typeof useActivityById>)

    render(<ActivityPlanningPage />)

    expect(screen.getByText('טעינת תכנון התפעול נכשל')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'ניסיון חוזר' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('renders empty state when no task instances exist', () => {
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
    } as ReturnType<typeof useActivityById>)

    useActivityTasksMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [{ id: 'task-1', activityId: 'activity-1', name: 'הכנה', description: null }],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityTasks>)

    useActivityTaskInstancesMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityTaskInstances>)

    render(<ActivityPlanningPage />)

    expect(screen.getByText('אין מופעים להצגה עבור משימה זו.')).toBeDefined()
  })

  it('navigates back to activity details', () => {
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
    } as ReturnType<typeof useActivityById>)

    useActivityTasksMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityTasks>)

    useActivityTaskInstancesMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityTaskInstances>)

    render(<ActivityPlanningPage />)

    fireEvent.click(screen.getByRole('button', { name: 'חזרה לפרטי התעסוקה' }))
    expect(navigateMock).toHaveBeenCalledWith('/activities/activity-1')
  })
})
