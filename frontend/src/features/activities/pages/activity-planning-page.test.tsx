import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/app/auth/use-permissions', () => ({
  usePermissions: vi.fn(),
}))

vi.mock('@/features/activities/queries/use-activities', () => ({
  useActivityById: vi.fn(),
}))

vi.mock('@/features/activities/queries/use-activity-scheduling-day', () => ({
  useApproveActivitySchedulingDay: vi.fn(),
  useActivitySchedulingDay: vi.fn(),
  useOpenActivitySchedulingDay: vi.fn(),
  useReturnActivitySchedulingDayToDraft: vi.fn(),
  useSubmitActivitySchedulingDayForApproval: vi.fn(),
}))

vi.mock('@/features/activities/queries/use-activity-tasks', () => ({
  useActivityTasks: vi.fn(),
  useAvailableUsers: vi.fn(),
  useCreateActivityTaskInstance: vi.fn(),
  useCreateTaskInstanceAssignment: vi.fn(),
  useUpdateActivityTaskInstance: vi.fn(),
  useDeleteActivityTaskInstance: vi.fn(),
  useDeleteAssignment: vi.fn(),
}))

vi.mock('@/features/users/queries/use-users', () => ({
  useCompanyUsers: vi.fn(),
}))

const {
  navigateMock,
  useParamsMock,
  schedulingRefetchMock,
  companyUsersRefetchMock,
  openSchedulingDayMutateAsyncMock,
  submitSchedulingDayForApprovalMutateAsyncMock,
  approveSchedulingDayMutateAsyncMock,
  returnSchedulingDayToDraftMutateAsyncMock,
  createTaskInstanceMutateAsyncMock,
  updateTaskInstanceMutateAsyncMock,
  deleteTaskInstanceMutateAsyncMock,
  createAssignmentMutateAsyncMock,
  deleteAssignmentMutateAsyncMock,
  replaceDeleteAssignmentMutateAsyncMock,
  hasPermissionMock,
} = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  useParamsMock: vi.fn(),
  schedulingRefetchMock: vi.fn(),
  companyUsersRefetchMock: vi.fn(),
  openSchedulingDayMutateAsyncMock: vi.fn(),
  submitSchedulingDayForApprovalMutateAsyncMock: vi.fn(),
  approveSchedulingDayMutateAsyncMock: vi.fn(),
  returnSchedulingDayToDraftMutateAsyncMock: vi.fn(),
  createTaskInstanceMutateAsyncMock: vi.fn(),
  updateTaskInstanceMutateAsyncMock: vi.fn(),
  deleteTaskInstanceMutateAsyncMock: vi.fn(),
  createAssignmentMutateAsyncMock: vi.fn(),
  deleteAssignmentMutateAsyncMock: vi.fn(),
  replaceDeleteAssignmentMutateAsyncMock: vi.fn(),
  hasPermissionMock: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: useParamsMock,
  }
})

import { usePermissions } from '@/app/auth/use-permissions'
import { ActivityPlanningPage } from '@/features/activities/pages/activity-planning-page'
import { useActivityById } from '@/features/activities/queries/use-activities'
import {
  useApproveActivitySchedulingDay,
  useActivitySchedulingDay,
  useOpenActivitySchedulingDay,
  useReturnActivitySchedulingDayToDraft,
  useSubmitActivitySchedulingDayForApproval,
} from '@/features/activities/queries/use-activity-scheduling-day'
import {
  useActivityTasks,
  useAvailableUsers,
  useCreateActivityTaskInstance,
  useCreateTaskInstanceAssignment,
  useDeleteActivityTaskInstance,
  useDeleteAssignment,
  useUpdateActivityTaskInstance,
} from '@/features/activities/queries/use-activity-tasks'
import { useCompanyUsers } from '@/features/users/queries/use-users'

const usePermissionsMock = vi.mocked(usePermissions)
const useActivityByIdMock = vi.mocked(useActivityById)
const useApproveActivitySchedulingDayMock = vi.mocked(useApproveActivitySchedulingDay)
const useActivitySchedulingDayMock = vi.mocked(useActivitySchedulingDay)
const useOpenActivitySchedulingDayMock = vi.mocked(useOpenActivitySchedulingDay)
const useReturnActivitySchedulingDayToDraftMock = vi.mocked(useReturnActivitySchedulingDayToDraft)
const useSubmitActivitySchedulingDayForApprovalMock = vi.mocked(useSubmitActivitySchedulingDayForApproval)
const useActivityTasksMock = vi.mocked(useActivityTasks)
const useAvailableUsersMock = vi.mocked(useAvailableUsers)
const useCreateActivityTaskInstanceMock = vi.mocked(useCreateActivityTaskInstance)
const useCreateTaskInstanceAssignmentMock = vi.mocked(useCreateTaskInstanceAssignment)
const useUpdateActivityTaskInstanceMock = vi.mocked(useUpdateActivityTaskInstance)
const useDeleteActivityTaskInstanceMock = vi.mocked(useDeleteActivityTaskInstance)
const useDeleteAssignmentMock = vi.mocked(useDeleteAssignment)
const useCompanyUsersMock = vi.mocked(useCompanyUsers)

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
        severity: 'CRITICAL',
        reasonCodes: ['MISSING_REQUIRED_ROLE', 'MISSING_OPTIONAL_QUALIFICATION', 'UNAVAILABLE_FOR_TIME_WINDOW'],
        reasonMessages: ['חסר תפקיד חובה', 'חסרה הסמכה אופציונלית', 'החייל לא זמין למשבצת הזמן הזאת'],
        reasons: [
          {
            code: 'MISSING_REQUIRED_ROLE',
            severity: 'CRITICAL',
            message: 'חסר תפקיד חובה',
            roleId: 'role-1',
            roleName: 'חובש',
          },
          {
            code: 'MISSING_OPTIONAL_QUALIFICATION',
            severity: 'WARNING',
            message: 'חסרה הסמכה אופציונלית',
            qualificationId: 'qual-1',
            qualificationName: 'ירי',
          },
          {
            code: 'UNAVAILABLE_FOR_TIME_WINDOW',
            severity: 'WARNING',
            message: 'החייל לא זמין למשבצת הזמן הזאת',
          },
        ],
      },
    },
  ],
  validation: {
    requiredErrors: [{ type: 'MANPOWER', message: 'חסר כוח אדם' }],
    warnings: [{ type: 'AVAILABILITY', message: 'זמינות חלקית' }],
    summary: { isValid: false },
  },
}

const overnightTaskInstance = {
  ...baseTaskInstance,
  id: 'instance-2',
  title: 'משמרת לילה',
  startTime: '2026-08-11T22:00:00.000Z',
  endTime: '2026-08-12T04:00:00.000Z',
  isOvernight: true,
  assignmentSlots: { total: 1, filled: 0, unfilled: 1 },
  assignments: [],
  validation: {
    requiredErrors: [{ type: 'MANPOWER', message: 'חסר כוח אדם' }],
    warnings: [],
    summary: { isValid: false },
  },
}

const warningOnlyTaskInstance = {
  ...baseTaskInstance,
  id: 'instance-3',
  activityTaskId: 'task-3',
  activityTask: {
    id: 'task-3',
    name: 'לוגיסטיקה',
    description: 'סיוע לוגיסטי',
  },
  title: 'משמרת ערב',
  startTime: '2026-08-11T16:00:00.000Z',
  endTime: '2026-08-11T20:00:00.000Z',
  assignmentSlots: {
    total: 1,
    filled: 1,
    unfilled: 0,
  },
  assignments: [
    {
      ...baseTaskInstance.assignments[0],
      id: 'assignment-3',
      taskInstanceId: 'instance-3',
      userId: 'user-2',
      user: {
        id: 'user-2',
        firstName: 'רונית',
        lastName: 'לוי',
        personalNumber: '654321',
        phone: '0500000001',
        email: 'r@example.com',
        isActive: true,
        unit: { id: 'unit-1', name: 'א׳' },
      },
      availability: {
        status: 'ACTIVE',
        availability: 'MORNING',
      },
      evaluation: {
        userId: 'user-2',
        severity: 'WARNING',
        reasonCodes: ['MISSING_OPTIONAL_ROLE'],
        reasonMessages: ['חסר תפקיד אופציונלי'],
        reasons: [
          {
            code: 'MISSING_OPTIONAL_ROLE',
            severity: 'WARNING',
            message: 'חסר תפקיד אופציונלי',
            roleId: 'role-2',
            roleName: 'נהג',
          },
        ],
      },
    },
  ],
}

const normalTaskInstance = {
  ...baseTaskInstance,
  id: 'instance-4',
  activityTaskId: 'task-4',
  activityTask: {
    id: 'task-4',
    name: 'שמירה',
    description: 'שמירת היקף',
  },
  title: 'שמירה שקטה',
  startTime: '2026-08-11T12:00:00.000Z',
  endTime: '2026-08-11T14:00:00.000Z',
  assignmentSlots: {
    total: 1,
    filled: 1,
    unfilled: 0,
  },
  assignments: [
    {
      ...baseTaskInstance.assignments[0],
      id: 'assignment-4',
      taskInstanceId: 'instance-4',
      evaluation: {
        userId: 'user-1',
        severity: 'NORMAL',
        reasonCodes: [],
        reasonMessages: [],
        reasons: [],
      },
    },
  ],
  validation: {
    requiredErrors: [],
    warnings: [],
    summary: { isValid: true },
  },
}

const buildSchedulingDayData = (
  date: string,
  isDayOpened: boolean,
  taskInstances: any[] = [],
  schedulingStatus: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' = 'DRAFT',
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
  schedulingStatus,
  taskInstances,
})

const makeSchedulingQuery = (overrides: Record<string, unknown> = {}) => ({
  isPending: false,
  isError: false,
  data: buildSchedulingDayData('2026-08-10', false),
  refetch: schedulingRefetchMock,
  ...overrides,
})

const makeOpenSchedulingDayMutation = (overrides: Record<string, unknown> = {}) => ({
  mutateAsync: openSchedulingDayMutateAsyncMock,
  isPending: false,
  ...overrides,
})

const makeApprovalTransitionMutation = (
  mutateAsync: typeof submitSchedulingDayForApprovalMutateAsyncMock,
  overrides: Record<string, unknown> = {},
) => ({
  mutateAsync,
  isPending: false,
  ...overrides,
})

const renderOpenedDay = async () => {
  render(<ActivityPlanningPage />)
  fireEvent.click(screen.getByRole('button', { name: /הבא/ }))
  await waitFor(() => {
    expect(screen.getByTestId('planning-scheduling-grid')).toBeDefined()
  })
}

describe('ActivityPlanningPage', () => {
  let selectedClosedDayOpened = false

  beforeEach(() => {
    usePermissionsMock.mockReset()
    useActivityByIdMock.mockReset()
    useApproveActivitySchedulingDayMock.mockReset()
    useActivitySchedulingDayMock.mockReset()
    useOpenActivitySchedulingDayMock.mockReset()
    useReturnActivitySchedulingDayToDraftMock.mockReset()
    useSubmitActivitySchedulingDayForApprovalMock.mockReset()
    useActivityTasksMock.mockReset()
    useAvailableUsersMock.mockReset()
    useCreateActivityTaskInstanceMock.mockReset()
    useCreateTaskInstanceAssignmentMock.mockReset()
    useUpdateActivityTaskInstanceMock.mockReset()
    useDeleteActivityTaskInstanceMock.mockReset()
    useDeleteAssignmentMock.mockReset()
    useCompanyUsersMock.mockReset()
    navigateMock.mockReset()
    useParamsMock.mockReset()
    schedulingRefetchMock.mockReset()
    companyUsersRefetchMock.mockReset()
    openSchedulingDayMutateAsyncMock.mockReset()
    submitSchedulingDayForApprovalMutateAsyncMock.mockReset()
    approveSchedulingDayMutateAsyncMock.mockReset()
    returnSchedulingDayToDraftMutateAsyncMock.mockReset()
    createTaskInstanceMutateAsyncMock.mockReset()
    updateTaskInstanceMutateAsyncMock.mockReset()
    deleteTaskInstanceMutateAsyncMock.mockReset()
    createAssignmentMutateAsyncMock.mockReset()
    deleteAssignmentMutateAsyncMock.mockReset()
    replaceDeleteAssignmentMutateAsyncMock.mockReset()
    hasPermissionMock.mockReset()

    selectedClosedDayOpened = false

    createTaskInstanceMutateAsyncMock.mockResolvedValue({ id: 'instance-created' })
    updateTaskInstanceMutateAsyncMock.mockResolvedValue({ id: 'instance-1', activityTaskId: 'task-1' })
    deleteTaskInstanceMutateAsyncMock.mockResolvedValue({ id: 'instance-1', activityTaskId: 'task-1' })
    createAssignmentMutateAsyncMock.mockResolvedValue({ id: 'assignment-created' })
    deleteAssignmentMutateAsyncMock.mockResolvedValue({ id: 'assignment-1', taskInstanceId: 'instance-1' })
    replaceDeleteAssignmentMutateAsyncMock.mockResolvedValue({ id: 'assignment-1', taskInstanceId: 'instance-1' })
    openSchedulingDayMutateAsyncMock.mockImplementation(async () => {
      selectedClosedDayOpened = true
      return {
        activityId: 'activity-1',
        date: '2026-08-10',
        isDayOpened: true,
      }
    })
    submitSchedulingDayForApprovalMutateAsyncMock.mockResolvedValue({
      activityId: 'activity-1',
      date: '2026-08-10',
      isDayOpened: true,
      schedulingStatus: 'PENDING_APPROVAL',
    })
    approveSchedulingDayMutateAsyncMock.mockResolvedValue({
      activityId: 'activity-1',
      date: '2026-08-10',
      isDayOpened: true,
      schedulingStatus: 'APPROVED',
    })
    returnSchedulingDayToDraftMutateAsyncMock.mockResolvedValue({
      activityId: 'activity-1',
      date: '2026-08-10',
      isDayOpened: true,
      schedulingStatus: 'DRAFT',
    })

    hasPermissionMock.mockImplementation((permission: string) => permission === 'MANAGE_COMPANIES')
    usePermissionsMock.mockReturnValue({
      hasPermission: hasPermissionMock,
      permissions: [],
      isInitializing: false,
      isAuthenticated: true,
    })

    useParamsMock.mockReturnValue({ activityId: 'activity-1' })
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: activityData,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityById>)

    useActivityTasksMock.mockReturnValue({
      isPending: false,
      data: [
        {
          id: 'task-1',
          activityId: 'activity-1',
          name: 'הכנה',
          description: 'desc',
          createdAt: '2026-08-10T00:00:00.000Z',
          updatedAt: '2026-08-10T00:00:00.000Z',
        },
        {
          id: 'task-2',
          activityId: 'activity-1',
          name: 'תצפית',
          description: 'desc',
          createdAt: '2026-08-10T00:00:00.000Z',
          updatedAt: '2026-08-10T00:00:00.000Z',
        },
      ],
    } as unknown as ReturnType<typeof useActivityTasks>)

    useAvailableUsersMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [
        {
          id: 'user-2',
          firstName: 'רונית',
          lastName: 'לוי',
          phone: '0500000001',
          email: 'r@example.com',
          personalNumber: '654321',
          isActive: true,
        },
        {
          id: 'user-3',
          firstName: 'דנה',
          lastName: 'מזרחי',
          phone: '0500000002',
          email: 'd@example.com',
          personalNumber: '777777',
          isActive: true,
        },
      ],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useAvailableUsers>)

    useCreateActivityTaskInstanceMock.mockReturnValue({
      mutateAsync: createTaskInstanceMutateAsyncMock,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateActivityTaskInstance>)

    useCreateTaskInstanceAssignmentMock.mockReturnValue({
      mutateAsync: createAssignmentMutateAsyncMock,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateTaskInstanceAssignment>)

    useUpdateActivityTaskInstanceMock.mockReturnValue({
      mutateAsync: updateTaskInstanceMutateAsyncMock,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateActivityTaskInstance>)

    useDeleteActivityTaskInstanceMock.mockReturnValue({
      mutateAsync: deleteTaskInstanceMutateAsyncMock,
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteActivityTaskInstance>)

    useDeleteAssignmentMock.mockImplementation((scope) => ({
      mutateAsync: scope ? deleteAssignmentMutateAsyncMock : replaceDeleteAssignmentMutateAsyncMock,
      isPending: false,
    }) as unknown as ReturnType<typeof useDeleteAssignment>)

    useOpenActivitySchedulingDayMock.mockImplementation(() =>
      makeOpenSchedulingDayMutation() as unknown as ReturnType<typeof useOpenActivitySchedulingDay>,
    )
    useSubmitActivitySchedulingDayForApprovalMock.mockImplementation(() =>
      makeApprovalTransitionMutation(
        submitSchedulingDayForApprovalMutateAsyncMock,
      ) as unknown as ReturnType<typeof useSubmitActivitySchedulingDayForApproval>,
    )
    useApproveActivitySchedulingDayMock.mockImplementation(() =>
      makeApprovalTransitionMutation(
        approveSchedulingDayMutateAsyncMock,
      ) as unknown as ReturnType<typeof useApproveActivitySchedulingDay>,
    )
    useReturnActivitySchedulingDayToDraftMock.mockImplementation(() =>
      makeApprovalTransitionMutation(
        returnSchedulingDayToDraftMutateAsyncMock,
      ) as unknown as ReturnType<typeof useReturnActivitySchedulingDayToDraft>,
    )

    useCompanyUsersMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        items: [
          {
            id: 'user-1',
            firstName: 'איילה',
            lastName: 'כהן',
            phone: '0500000000',
            email: 'a@example.com',
            personalNumber: '123456',
            isActive: true,
            unit: { id: 'unit-1', name: 'א׳', description: null, displayOrder: 1 },
            roles: [],
            qualifications: [],
          },
          {
            id: 'user-2',
            firstName: 'רונית',
            lastName: 'לוי',
            phone: '0500000001',
            email: 'r@example.com',
            personalNumber: '654321',
            isActive: true,
            unit: { id: 'unit-1', name: 'א׳', description: null, displayOrder: 1 },
            roles: [],
            qualifications: [],
          },
          {
            id: 'user-3',
            firstName: 'דנה',
            lastName: 'מזרחי',
            phone: '0500000002',
            email: 'd@example.com',
            personalNumber: '777777',
            isActive: true,
            unit: { id: 'unit-1', name: 'א׳', description: null, displayOrder: 1 },
            roles: [],
            qualifications: [],
          },
          {
            id: 'user-4',
            firstName: 'נועם',
            lastName: 'ברק',
            phone: '0500000003',
            email: 'n@example.com',
            personalNumber: '888888',
            isActive: true,
            unit: { id: 'unit-1', name: 'א׳', description: null, displayOrder: 1 },
            roles: [],
            qualifications: [],
          },
        ],
        total: 4,
        page: 1,
        pageSize: 100,
      },
      refetch: companyUsersRefetchMock,
    } as unknown as ReturnType<typeof useCompanyUsers>)

    useActivitySchedulingDayMock.mockImplementation((requestedActivityId, date) => {
      if (requestedActivityId !== 'activity-1' || !date) {
        return makeSchedulingQuery({ isPending: true, data: undefined }) as ReturnType<typeof useActivitySchedulingDay>
      }

      if (date === '2026-08-11') {
        return makeSchedulingQuery({
          data: buildSchedulingDayData(date, true, [
            baseTaskInstance,
            overnightTaskInstance,
            warningOnlyTaskInstance,
            normalTaskInstance,
          ]),
        }) as ReturnType<typeof useActivitySchedulingDay>
      }

      if (date === '2026-08-12') {
        return makeSchedulingQuery({ data: buildSchedulingDayData(date, true, []) }) as ReturnType<typeof useActivitySchedulingDay>
      }

      return makeSchedulingQuery({
        data: buildSchedulingDayData(date, date === '2026-08-10' ? selectedClosedDayOpened : false, []),
      }) as ReturnType<typeof useActivitySchedulingDay>
    })
  })

  it('initializes selected date to activity start date', async () => {
    render(<ActivityPlanningPage />)

    await waitFor(() => {
      expect(useActivitySchedulingDayMock).toHaveBeenLastCalledWith('activity-1', '2026-08-10')
    })

    expect(screen.getByTestId('planning-selected-day-title').textContent).toContain('10.08.2026')
  })

  it('removes the scheduling details section and keeps board header as primary', () => {
    render(<ActivityPlanningPage />)

    expect(screen.queryByText('פרטי יום שיבוץ')).toBeNull()
    expect(screen.getByTestId('planning-board-primary-header')).toBeDefined()
  })

  it('keeps unopened-day state and open-day action for a closed day', () => {
    render(<ActivityPlanningPage />)

    expect(screen.getByText('היום עדיין לא נפתח')).toBeDefined()
    expect(screen.getByRole('button', { name: 'פתח יום שיבוץ' })).toBeDefined()
  })

  it('opens a closed day through the existing mutation flow', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { rerender } = render(<ActivityPlanningPage />)

    fireEvent.click(screen.getByRole('button', { name: 'פתח יום שיבוץ' }))

    await waitFor(() => {
      expect(openSchedulingDayMutateAsyncMock).toHaveBeenCalledTimes(1)
    })

    rerender(<ActivityPlanningPage />)

    await waitFor(() => {
      expect(screen.getByText('אין מופעי משימה ליום פתוח זה')).toBeDefined()
    })

    confirmSpy.mockRestore()
  })

  it('renders scheduling status and submit action in draft state', () => {
    render(<ActivityPlanningPage />)

    expect(within(screen.getByTestId('planning-scheduling-status')).getByText('טיוטה')).toBeDefined()
    expect(screen.getByRole('button', { name: 'שלח לאישור' })).toBeDefined()
  })

  it('shows approver actions in pending-approval status and keeps editing controls visible', async () => {
    hasPermissionMock.mockImplementation((permission: string) => permission === 'APPROVE_SCHEDULING')
    useActivitySchedulingDayMock.mockImplementation((requestedActivityId, date) => {
      if (requestedActivityId !== 'activity-1' || !date) {
        return makeSchedulingQuery({ isPending: true, data: undefined }) as ReturnType<typeof useActivitySchedulingDay>
      }

      if (date === '2026-08-11') {
        return makeSchedulingQuery({
          data: buildSchedulingDayData(date, true, [baseTaskInstance, warningOnlyTaskInstance, normalTaskInstance], 'PENDING_APPROVAL'),
        }) as ReturnType<typeof useActivitySchedulingDay>
      }

      return makeSchedulingQuery({ data: buildSchedulingDayData(date, false, []) }) as ReturnType<typeof useActivitySchedulingDay>
    })

    await renderOpenedDay()

    expect(screen.getByRole('button', { name: 'אשר שיבוץ' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'החזר לתיקון' })).toBeDefined()
    expect(screen.getAllByRole('button', { name: 'עריכת מופע משימה' }).length).toBeGreaterThan(0)
    expect(within(screen.getByTestId('planning-scheduling-status')).getByText('ממתין לאישור')).toBeDefined()
  })

  it('executes approve action directly without confirmation popup', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    hasPermissionMock.mockImplementation((permission: string) => permission === 'APPROVE_SCHEDULING')
    useActivitySchedulingDayMock.mockImplementation((requestedActivityId, date) => {
      if (requestedActivityId !== 'activity-1' || !date) {
        return makeSchedulingQuery({ isPending: true, data: undefined }) as ReturnType<typeof useActivitySchedulingDay>
      }

      if (date === '2026-08-11') {
        return makeSchedulingQuery({
          data: buildSchedulingDayData(date, true, [baseTaskInstance], 'PENDING_APPROVAL'),
        }) as ReturnType<typeof useActivitySchedulingDay>
      }

      return makeSchedulingQuery({ data: buildSchedulingDayData(date, false, []) }) as ReturnType<typeof useActivitySchedulingDay>
    })

    await renderOpenedDay()

    fireEvent.click(screen.getByRole('button', { name: 'אשר שיבוץ' }))

    await waitFor(() => {
      expect(approveSchedulingDayMutateAsyncMock).toHaveBeenCalledTimes(1)
    })
    expect(confirmSpy).not.toHaveBeenCalledWith('האם לאשר את יום השיבוץ הנבחר?')

    confirmSpy.mockRestore()
  })

  it('renders board header date/status centered with next on left and previous on right', () => {
    render(<ActivityPlanningPage />)

    const header = screen.getByTestId('planning-board-primary-header')
    expect(header.firstElementChild).toBe(screen.getByTestId('planning-next-day-button'))
    expect(header.lastElementChild).toBe(screen.getByTestId('planning-previous-day-button'))
    expect(screen.getByTestId('planning-board-date-status')).toBeDefined()
    expect(within(screen.getByTestId('planning-scheduling-status')).getByText('טיוטה')).toBeDefined()
  })

  it('renders task definitions as columns and places blocks inside the correct task column', async () => {
    await renderOpenedDay()

    expect(screen.getByTestId('planning-column-header-task-1')).toBeDefined()
    expect(screen.getByTestId('planning-column-header-task-2')).toBeDefined()
    expect(screen.getByTestId('planning-column-header-task-3')).toBeDefined()
    expect(screen.getByTestId('planning-column-header-task-4')).toBeDefined()

    const taskOneColumn = screen.getByTestId('planning-task-column-task-1')
    expect(within(taskOneColumn).getByTestId('planning-instance-block-instance-1')).toBeDefined()
    expect(within(taskOneColumn).getByTestId('planning-instance-block-instance-2')).toBeDefined()
    expect(within(taskOneColumn).queryByTestId('planning-instance-block-instance-3')).toBeNull()
  })

  it('uses a 06:00-based operational placement for task blocks', async () => {
    await renderOpenedDay()

    const morningBlock = screen.getByTestId('planning-instance-block-instance-1')
    const overnightBlock = screen.getByTestId('planning-instance-block-instance-2')

    expect(morningBlock.getAttribute('data-start-minute')).toBe('120')
    expect(morningBlock.getAttribute('data-duration-minutes')).toBe('240')
    expect(overnightBlock.getAttribute('data-start-minute')).toBe('960')
    expect(overnightBlock.getAttribute('data-duration-minutes')).toBe('360')
  })

  it('renders a fixed operational timeline window from 06:00 to 06:00 next day', async () => {
    await renderOpenedDay()

    expect(screen.getByTestId('planning-time-axis-window').textContent).toContain('06:00 → 06:00 (+1)')
    expect(screen.getByTestId('planning-time-axis-label-0').textContent).toBe('06:00')
    expect(screen.getByTestId('planning-time-axis-label-17').textContent).toBe('23:00')
    expect(screen.getByTestId('planning-time-axis-label-18').textContent).toBe('00:00')
    expect(screen.getByTestId('planning-time-axis-label-24').textContent).toBe('06:00')
  })

  it('renders the time axis on the right side of the board', async () => {
    await renderOpenedDay()

    const grid = screen.getByTestId('planning-scheduling-grid')
    const boardRow = grid.querySelector(':scope > div')

    expect(boardRow?.lastElementChild).toBe(screen.getByTestId('planning-time-axis'))
  })

  it('does not create an internal vertical scroll container for the grid', async () => {
    await renderOpenedDay()

    const grid = screen.getByTestId('planning-scheduling-grid')
    const verticalScrollContainers = grid.querySelectorAll('.overflow-y-auto, .overflow-y-scroll')

    expect(verticalScrollContainers.length).toBe(0)
  })

  it('uses horizontal overflow container without forcing vertical overflow', async () => {
    await renderOpenedDay()

    const grid = screen.getByTestId('planning-scheduling-grid')
    const horizontalContainer = grid.querySelector('.overflow-x-auto') as HTMLElement | null

    expect(horizontalContainer).toBeTruthy()
    expect(horizontalContainer?.className.includes('overflow-y-auto')).toBe(false)
    expect(horizontalContainer?.className.includes('overflow-y-scroll')).toBe(false)
  })

  it('keeps task columns compact', async () => {
    await renderOpenedDay()

    const headerColumn = screen.getByTestId('planning-column-header-task-1') as HTMLElement
    const bodyColumn = screen.getByTestId('planning-task-column-task-1') as HTMLElement

    expect(headerColumn.style.width).toBe('240px')
    expect(bodyColumn.style.width).toBe('240px')
  })

  it('keeps overnight instances on the board of their start day', async () => {
    await renderOpenedDay()

    expect(screen.getByTestId('planning-instance-block-instance-2')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: /הבא/ }))

    await waitFor(() => {
      expect(screen.getByText('אין מופעי משימה ליום פתוח זה')).toBeDefined()
    })
  })

  it('does not extend task block duration beyond actual start and end time', async () => {
    const shortTaskInstance = {
      ...baseTaskInstance,
      id: 'instance-short',
      startTime: '2026-08-11T12:00:00.000Z',
      endTime: '2026-08-11T12:30:00.000Z',
      assignmentSlots: { total: 1, filled: 0, unfilled: 1 },
      assignments: [],
      validation: { requiredErrors: [], warnings: [], summary: { isValid: true } },
    }

    useActivitySchedulingDayMock.mockImplementation((requestedActivityId, date) => {
      if (requestedActivityId !== 'activity-1' || !date) {
        return makeSchedulingQuery({ isPending: true, data: undefined }) as ReturnType<typeof useActivitySchedulingDay>
      }

      if (date === '2026-08-11') {
        return makeSchedulingQuery({
          data: buildSchedulingDayData(date, true, [shortTaskInstance]),
        }) as ReturnType<typeof useActivitySchedulingDay>
      }

      return makeSchedulingQuery({ data: buildSchedulingDayData(date, false, []) }) as ReturnType<typeof useActivitySchedulingDay>
    })

    await renderOpenedDay()

    const shortBlock = screen.getByTestId('planning-instance-block-instance-short')
    expect(shortBlock.getAttribute('data-start-minute')).toBe('360')
    expect(shortBlock.getAttribute('data-duration-minutes')).toBe('30')
  })

  it('renders assignment fields according to manpower slots and keeps requirement labels above fields', async () => {
    await renderOpenedDay()

    expect(screen.getByTestId('planning-slot-instance-1-0')).toBeDefined()
    expect(screen.getByTestId('planning-slot-instance-1-1')).toBeDefined()
    expect(screen.getByTestId('planning-slot-instance-2-0')).toBeDefined()
    expect(screen.getAllByText(/חובש/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/ירי/).length).toBeGreaterThan(0)

    const slot = screen.getByTestId('planning-slot-instance-1-0')
    const requirementText = within(slot).getByText('חובש · ירי')
    const input = within(slot).getByLabelText('שיבוץ חייל')

    expect(requirementText.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('keeps the paginated company users query and renders compact assignment selectors', async () => {
    await renderOpenedDay()

    const emptySlot = screen.getByTestId('planning-slot-instance-2-0')
    expect(within(emptySlot).getByLabelText('שיבוץ חייל')).toBeDefined()
    expect(useCompanyUsersMock).toHaveBeenCalledWith('company-1', {
      page: 1,
      pageSize: 100,
      sortBy: 'firstName',
      sortOrder: 'asc',
    })
  })

  it('shows available soldiers immediately when opening an empty assignment field', async () => {
    await renderOpenedDay()

    const emptySlot = screen.getByTestId('planning-slot-instance-2-0')
    fireEvent.focus(within(emptySlot).getByLabelText('שיבוץ חייל'))

    expect(within(emptySlot).getByRole('button', { name: /רונית לוי/i })).toBeDefined()
    expect(within(emptySlot).getByRole('button', { name: /דנה מזרחי/i })).toBeDefined()
  })

  it('assigns a soldier from the selector without requiring a replace-action button', async () => {
    await renderOpenedDay()

    const emptySlot = screen.getByTestId('planning-slot-instance-2-0')
    fireEvent.change(within(emptySlot).getByLabelText('שיבוץ חייל'), { target: { value: 'רונית' } })
    fireEvent.click(within(emptySlot).getByRole('button', { name: /רונית לוי/i }))

    await waitFor(() => {
      expect(createAssignmentMutateAsyncMock).toHaveBeenCalledWith({ userId: 'user-2' })
    })

    expect(useCreateTaskInstanceAssignmentMock).toHaveBeenCalledWith('instance-2', {
      activityId: 'activity-1',
      date: '2026-08-11',
    })
    expect(screen.queryByRole('button', { name: 'החלף חייל' })).toBeNull()
  })

  it('supports searching and selecting unavailable users through the selector', async () => {
    await renderOpenedDay()

    const emptySlot = screen.getByTestId('planning-slot-instance-2-0')
    fireEvent.change(within(emptySlot).getByLabelText('שיבוץ חייל'), { target: { value: 'נועם' } })
    fireEvent.click(within(emptySlot).getByRole('button', { name: /נועם ברק/i }))

    await waitFor(() => {
      expect(createAssignmentMutateAsyncMock).toHaveBeenCalledWith({ userId: 'user-4' })
    })
  })

  it('displays assigned soldiers and local warning details from the read model', async () => {
    await renderOpenedDay()

    const filledSlot = screen.getByTestId('planning-slot-instance-1-0')
    expect((within(filledSlot).getByLabelText('שיבוץ חייל') as HTMLInputElement).value).toBe('איילה כהן')
    expect(screen.getByText('החייל אינו חובש')).toBeDefined()
    expect(screen.getByText('לחייל חסרה הסמכה: ירי')).toBeDefined()
    expect(screen.queryByText('החייל אינו זמין למשבצת הזמן')).toBeNull()
    expect(screen.getByText('החייל אינו נהג')).toBeDefined()
  })

  it('renders assignment validation as compact field-level text without bordered error cards', async () => {
    await renderOpenedDay()

    const evaluation = screen.getByTestId('planning-assignment-evaluation-assignment-1')
    expect(evaluation.className).toContain('text-danger')
    expect(evaluation.className).not.toContain('rounded')
    expect(evaluation.className).not.toContain('border')
  })

  it('shows empty assignment fields with error styling and no manpower text', async () => {
    await renderOpenedDay()

    expect(screen.queryByText('בעיות חובה')).toBeNull()
    expect(screen.queryByText('זמינות חלקית')).toBeNull()
    expect(screen.queryByText('חסר כוח אדם')).toBeNull()

    const emptySlot = screen.getByTestId('planning-slot-instance-1-1')
    const input = within(emptySlot).getByLabelText('שיבוץ חייל') as HTMLInputElement
    expect(input.className).toContain('border-danger/50')
  })

  it('does not render board filter controls', async () => {
    await renderOpenedDay()

    expect(screen.queryByTestId('planning-board-filters')).toBeNull()
    expect(screen.queryByRole('button', { name: 'דורש טיפול' })).toBeNull()
  })

  it('keeps KPI section compact and secondary', async () => {
    await renderOpenedDay()

    const kpiGrid = screen.getByTestId('planning-kpi-grid')
    expect(kpiGrid.className).toContain('gap-2')

    const coverageCard = screen.getByTestId('planning-summary-coverage')
    expect(coverageCard.className).toContain('p-2')
    expect(coverageCard.className).toContain('bg-surface/50')
  })

  it('replaces a soldier through the selector by deleting then creating', async () => {
    await renderOpenedDay()

    const filledSlot = screen.getByTestId('planning-slot-instance-1-0')
    fireEvent.change(within(filledSlot).getByLabelText('שיבוץ חייל'), { target: { value: 'רונית' } })
    fireEvent.click(within(filledSlot).getByRole('button', { name: /רונית לוי/i }))

    await waitFor(() => {
      expect(replaceDeleteAssignmentMutateAsyncMock).toHaveBeenCalledWith('assignment-1')
      expect(createAssignmentMutateAsyncMock).toHaveBeenCalledWith({ userId: 'user-2' })
    })

    expect(replaceDeleteAssignmentMutateAsyncMock.mock.invocationCallOrder[0]).toBeLessThan(
      createAssignmentMutateAsyncMock.mock.invocationCallOrder[0],
    )
  })

  it('clearing a filled selector removes the assignment with existing scheduling scope', async () => {
    await renderOpenedDay()

    const filledSlot = screen.getByTestId('planning-slot-instance-1-0')
    fireEvent.change(within(filledSlot).getByLabelText('שיבוץ חייל'), { target: { value: '' } })

    await waitFor(() => {
      expect(deleteAssignmentMutateAsyncMock).toHaveBeenCalledWith('assignment-1')
    })

    expect(useDeleteAssignmentMock).toHaveBeenCalledWith({
      activityId: 'activity-1',
      date: '2026-08-11',
    })
  })

  it('preserves the displayed soldier when clearing fails', async () => {
    deleteAssignmentMutateAsyncMock.mockRejectedValueOnce(new Error('delete failed'))

    await renderOpenedDay()

    const filledSlot = screen.getByTestId('planning-slot-instance-1-0')
    const input = within(filledSlot).getByLabelText('שיבוץ חייל') as HTMLInputElement

    fireEvent.change(input, { target: { value: '' } })

    await waitFor(() => {
      expect(within(filledSlot).getByText('מחיקת השיבוץ נכשלה. אפשר לנסות שוב.')).toBeDefined()
    })

    expect(input.value).toBe('איילה כהן')
  })

  it('prevents duplicate assignment submissions while a create request is pending', async () => {
    createAssignmentMutateAsyncMock.mockImplementationOnce(() => new Promise(() => {}))

    await renderOpenedDay()

    const emptySlot = screen.getByTestId('planning-slot-instance-2-0')
    fireEvent.change(within(emptySlot).getByLabelText('שיבוץ חייל'), { target: { value: 'רונית' } })
    const candidateButton = within(emptySlot).getByRole('button', { name: /רונית לוי/i })

    fireEvent.click(candidateButton)
    fireEvent.click(candidateButton)

    expect(createAssignmentMutateAsyncMock).toHaveBeenCalledTimes(1)
  })

  it('edits an existing task instance from the board and refetches day data', async () => {
    await renderOpenedDay()

    fireEvent.click(screen.getAllByRole('button', { name: 'עריכת מופע משימה' })[0])
    fireEvent.change(screen.getByLabelText('כותרת'), { target: { value: 'משמרת בוקר מעודכנת' } })
    fireEvent.click(screen.getByRole('button', { name: 'שמירת שינויים' }))

    await waitFor(() => {
      expect(updateTaskInstanceMutateAsyncMock).toHaveBeenCalledTimes(1)
    })

    expect(updateTaskInstanceMutateAsyncMock).toHaveBeenCalledWith({
      taskInstanceId: 'instance-1',
      body: {
        title: 'משמרת בוקר מעודכנת',
        startTime: expect.stringMatching(/Z$/),
        endTime: expect.stringMatching(/Z$/),
      },
    })
    expect(schedulingRefetchMock).toHaveBeenCalled()
  })

  it('deletes a task instance from the board and refetches day data', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    await renderOpenedDay()

    fireEvent.click(screen.getAllByRole('button', { name: 'מחיקת מופע משימה' })[0])

    await waitFor(() => {
      expect(deleteTaskInstanceMutateAsyncMock).toHaveBeenCalledWith('instance-1')
    })

    expect(schedulingRefetchMock).toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('renders without breaking when a task instance title is absent', async () => {
    const noTitleTaskInstance = {
      ...baseTaskInstance,
      id: 'instance-6',
      title: '',
      assignmentSlots: {
        total: 1,
        filled: 0,
        unfilled: 1,
      },
      assignments: [],
      validation: {
        requiredErrors: [{ type: 'MANPOWER', message: 'חסר כוח אדם' }],
        warnings: [],
        summary: { isValid: false },
      },
    }

    useActivitySchedulingDayMock.mockImplementation((requestedActivityId, date) => {
      if (requestedActivityId !== 'activity-1' || !date) {
        return makeSchedulingQuery({ isPending: true, data: undefined }) as ReturnType<typeof useActivitySchedulingDay>
      }

      if (date === '2026-08-11') {
        return makeSchedulingQuery({
          data: buildSchedulingDayData(date, true, [noTitleTaskInstance]),
        }) as ReturnType<typeof useActivitySchedulingDay>
      }

      return makeSchedulingQuery({ data: buildSchedulingDayData(date, false, []) }) as ReturnType<typeof useActivitySchedulingDay>
    })

    await renderOpenedDay()

    expect(screen.getByTestId('planning-instance-block-instance-6')).toBeDefined()
    expect(screen.getAllByText('הכנה').length).toBeGreaterThan(0)
  })

  it('uses icon-only task instance actions', async () => {
    await renderOpenedDay()

    expect(screen.getAllByRole('button', { name: 'עריכת מופע משימה' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'מחיקת מופע משימה' }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'עריכה' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'מחיקה' })).toBeNull()
  })

  it('does not render slot-number or manpower labels', async () => {
    await renderOpenedDay()

    expect(screen.queryByText(/תקן\s*1/i)).toBeNull()
    expect(screen.queryByText(/תקן\s*2/i)).toBeNull()
    expect(screen.queryByText('חובה')).toBeNull()
  })

  it('adds subtle positive state for correctly staffed instances', async () => {
    await renderOpenedDay()

    const readyBlock = screen.getByTestId('planning-instance-block-instance-4')
    const attentionBlock = screen.getByTestId('planning-instance-block-instance-1')

    expect(readyBlock.getAttribute('data-staffing-state')).toBe('ready')
    expect(attentionBlock.getAttribute('data-staffing-state')).toBe('attention')
  })

  it('keeps existing day navigation behavior and boundaries', async () => {
    render(<ActivityPlanningPage />)

    const previousButton = screen.getByRole('button', { name: /קודם/ }) as HTMLButtonElement
    expect(previousButton.disabled).toBe(true)

    const nextButton = screen.getByRole('button', { name: /הבא/ }) as HTMLButtonElement
    fireEvent.click(nextButton)
    await waitFor(() => {
      expect(useActivitySchedulingDayMock).toHaveBeenLastCalledWith('activity-1', '2026-08-11')
    })

    fireEvent.click(nextButton)
    fireEvent.click(nextButton)
    fireEvent.click(nextButton)
    fireEvent.click(nextButton)

    await waitFor(() => {
      expect(useActivitySchedulingDayMock).toHaveBeenLastCalledWith('activity-1', '2026-08-15')
    })

    expect(nextButton.disabled).toBe(true)
  })

  it('keeps planning navigation to the activity details route', () => {
    render(<ActivityPlanningPage />)

    fireEvent.click(screen.getByRole('button', { name: 'חזרה לפרטי הפעילות' }))
    expect(navigateMock).toHaveBeenCalledWith('/activities/activity-1')
  })
})
