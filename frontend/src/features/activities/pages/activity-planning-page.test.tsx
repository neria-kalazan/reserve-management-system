import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/activities/queries/use-activities', () => ({
  useActivityById: vi.fn(),
}))

vi.mock('@/features/activities/queries/use-activity-scheduling-day', () => ({
  useActivitySchedulingDay: vi.fn(),
}))

vi.mock('@/features/activities/queries/use-activity-tasks', () => ({
  useActivityTasks: vi.fn(),
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
  createTaskInstanceMutateAsyncMock,
  updateTaskInstanceMutateAsyncMock,
  deleteTaskInstanceMutateAsyncMock,
  createAssignmentMutateAsyncMock,
  deleteAssignmentMutateAsyncMock,
  replaceDeleteAssignmentMutateAsyncMock,
} = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  useParamsMock: vi.fn(),
  schedulingRefetchMock: vi.fn(),
  companyUsersRefetchMock: vi.fn(),
  createTaskInstanceMutateAsyncMock: vi.fn(),
  updateTaskInstanceMutateAsyncMock: vi.fn(),
  deleteTaskInstanceMutateAsyncMock: vi.fn(),
  createAssignmentMutateAsyncMock: vi.fn(),
  deleteAssignmentMutateAsyncMock: vi.fn(),
  replaceDeleteAssignmentMutateAsyncMock: vi.fn(),
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
import {
  useActivityTasks,
  useCreateActivityTaskInstance,
  useCreateTaskInstanceAssignment,
  useDeleteActivityTaskInstance,
  useDeleteAssignment,
  useUpdateActivityTaskInstance,
} from '@/features/activities/queries/use-activity-tasks'
import { useCompanyUsers } from '@/features/users/queries/use-users'
import { ActivityPlanningPage } from '@/features/activities/pages/activity-planning-page'

const useActivityByIdMock = vi.mocked(useActivityById)
const useActivitySchedulingDayMock = vi.mocked(useActivitySchedulingDay)
const useActivityTasksMock = vi.mocked(useActivityTasks)
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
  refetch: schedulingRefetchMock,
  ...overrides,
})

describe('ActivityPlanningPage', () => {
  beforeEach(() => {
    useActivityByIdMock.mockReset()
    useActivitySchedulingDayMock.mockReset()
    useActivityTasksMock.mockReset()
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
    createTaskInstanceMutateAsyncMock.mockReset()
    updateTaskInstanceMutateAsyncMock.mockReset()
    deleteTaskInstanceMutateAsyncMock.mockReset()
    createAssignmentMutateAsyncMock.mockReset()
    deleteAssignmentMutateAsyncMock.mockReset()
    replaceDeleteAssignmentMutateAsyncMock.mockReset()

    createTaskInstanceMutateAsyncMock.mockResolvedValue({ id: 'instance-created' })
    updateTaskInstanceMutateAsyncMock.mockResolvedValue({ id: 'instance-1', activityTaskId: 'task-1' })
    deleteTaskInstanceMutateAsyncMock.mockResolvedValue({ id: 'instance-1', activityTaskId: 'task-1' })
    createAssignmentMutateAsyncMock.mockResolvedValue({ id: 'assignment-created' })
    deleteAssignmentMutateAsyncMock.mockResolvedValue({ id: 'assignment-1', taskInstanceId: 'instance-1' })
    replaceDeleteAssignmentMutateAsyncMock.mockResolvedValue({ id: 'assignment-1', taskInstanceId: 'instance-1' })

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
          name: 'לוגיסטיקה',
          description: 'desc',
          createdAt: '2026-08-10T00:00:00.000Z',
          updatedAt: '2026-08-10T00:00:00.000Z',
        },
      ],
    } as unknown as ReturnType<typeof useActivityTasks>)

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
        ],
        total: 2,
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

  it('renders a soldier selector for an empty assignment slot using the paginated company users query', async () => {
    render(<ActivityPlanningPage />)

    fireEvent.click(screen.getByRole('button', { name: 'יום הבא' }))

    await waitFor(() => {
      expect(screen.getByTestId('planning-slot-instance-2-0')).toBeDefined()
    })

    const emptySlot = screen.getByTestId('planning-slot-instance-2-0')
    expect(within(emptySlot).getByLabelText('שיבוץ חייל למקום 1')).toBeDefined()
    expect(useCompanyUsersMock).toHaveBeenCalledWith('company-1', {
      page: 1,
      pageSize: 100,
      sortBy: 'firstName',
      sortOrder: 'asc',
    })
  })

  it('searching and selecting a soldier in an empty slot triggers assignment creation with scheduling scope', async () => {
    render(<ActivityPlanningPage />)

    fireEvent.click(screen.getByRole('button', { name: 'יום הבא' }))

    await waitFor(() => {
      expect(screen.getByTestId('planning-slot-instance-2-0')).toBeDefined()
    })

    const emptySlot = screen.getByTestId('planning-slot-instance-2-0')
    fireEvent.change(within(emptySlot).getByLabelText('שיבוץ חייל למקום 1'), { target: { value: 'רונית' } })
    fireEvent.click(within(emptySlot).getByRole('button', { name: /רונית לוי/i }))

    await waitFor(() => {
      expect(createAssignmentMutateAsyncMock).toHaveBeenCalledWith({ userId: 'user-2' })
    })

    expect(useCreateTaskInstanceAssignmentMock).toHaveBeenCalledWith('instance-2', {
      activityId: 'activity-1',
      date: '2026-08-11',
    })
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

  it('removing a filled assignment calls delete with scheduling scope and keeps existing task rendering intact', async () => {
    render(<ActivityPlanningPage />)

    fireEvent.click(screen.getByRole('button', { name: 'יום הבא' }))

    await waitFor(() => {
      expect(screen.getByText('איילה כהן')).toBeDefined()
    })

    fireEvent.click(screen.getByRole('button', { name: 'הסרת שיבוץ' }))

    await waitFor(() => {
      expect(deleteAssignmentMutateAsyncMock).toHaveBeenCalledWith('assignment-1')
    })

    expect(useDeleteAssignmentMock).toHaveBeenCalledWith({
      activityId: 'activity-1',
      date: '2026-08-11',
    })
    expect(screen.getByText('משמרת בוקר')).toBeDefined()
  })

  it('changing a soldier performs delete current assignment followed by create new assignment', async () => {
    render(<ActivityPlanningPage />)

    fireEvent.click(screen.getByRole('button', { name: 'יום הבא' }))

    await waitFor(() => {
      expect(screen.getByTestId('planning-slot-instance-1-0')).toBeDefined()
    })

    const filledSlot = screen.getByTestId('planning-slot-instance-1-0')
    fireEvent.change(within(filledSlot).getByLabelText('החלפת חייל'), { target: { value: 'רונית' } })
    fireEvent.click(within(filledSlot).getByRole('button', { name: /רונית לוי/i }))

    await waitFor(() => {
      expect(replaceDeleteAssignmentMutateAsyncMock).toHaveBeenCalledWith('assignment-1')
      expect(createAssignmentMutateAsyncMock).toHaveBeenCalledWith({ userId: 'user-2' })
    })

    expect(replaceDeleteAssignmentMutateAsyncMock.mock.invocationCallOrder[0]).toBeLessThan(
      createAssignmentMutateAsyncMock.mock.invocationCallOrder[0],
    )
  })

  it('mutation failure does not incorrectly remove the displayed soldier', async () => {
    deleteAssignmentMutateAsyncMock.mockRejectedValueOnce(new Error('delete failed'))

    render(<ActivityPlanningPage />)

    fireEvent.click(screen.getByRole('button', { name: 'יום הבא' }))

    await waitFor(() => {
      expect(screen.getByText('איילה כהן')).toBeDefined()
    })

    fireEvent.click(screen.getByRole('button', { name: 'הסרת שיבוץ' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined()
    })

    expect(screen.getByText('איילה כהן')).toBeDefined()
  })

  it('prevents duplicate assignment submissions while an assignment request is pending', async () => {
    createAssignmentMutateAsyncMock.mockImplementationOnce(
      () => new Promise(() => {}),
    )

    render(<ActivityPlanningPage />)

    fireEvent.click(screen.getByRole('button', { name: 'יום הבא' }))

    await waitFor(() => {
      expect(screen.getByTestId('planning-slot-instance-2-0')).toBeDefined()
    })

    const emptySlot = screen.getByTestId('planning-slot-instance-2-0')
    fireEvent.change(within(emptySlot).getByLabelText('שיבוץ חייל למקום 1'), { target: { value: 'רונית' } })
    const selectButton = within(emptySlot).getByRole('button', { name: /רונית לוי/i })

    fireEvent.click(selectButton)
    fireEvent.click(selectButton)

    expect(createAssignmentMutateAsyncMock).toHaveBeenCalledTimes(1)
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

  it('creates a task instance from the opened day board and refetches day data', async () => {
    render(<ActivityPlanningPage />)

    fireEvent.click(screen.getByRole('button', { name: 'יום הבא' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'הוספת מופע משימה' })).toBeDefined()
    })

    fireEvent.click(screen.getByRole('button', { name: 'הוספת מופע משימה' }))
    fireEvent.click(screen.getByRole('button', { name: 'יצירת מופע' }))

    await waitFor(() => {
      expect(createTaskInstanceMutateAsyncMock).toHaveBeenCalledTimes(1)
    })

    expect(createTaskInstanceMutateAsyncMock).toHaveBeenCalledWith({
      title: 'הכנה',
      startTime: expect.stringMatching(/Z$/),
      endTime: expect.stringMatching(/Z$/),
    })
    expect(schedulingRefetchMock).toHaveBeenCalled()
  })

  it('edits an existing task instance from the board and refetches day data', async () => {
    render(<ActivityPlanningPage />)

    fireEvent.click(screen.getByRole('button', { name: 'יום הבא' }))

    await waitFor(() => {
      expect(screen.getByText('משמרת בוקר')).toBeDefined()
    })

    const editButtons = screen.getAllByRole('button', { name: 'עריכה' })
    fireEvent.click(editButtons[0])

    const titleInput = screen.getByLabelText('כותרת')
    fireEvent.change(titleInput, { target: { value: 'משמרת בוקר מעודכנת' } })
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

    render(<ActivityPlanningPage />)

    fireEvent.click(screen.getByRole('button', { name: 'יום הבא' }))

    await waitFor(() => {
      expect(screen.getByText('משמרת בוקר')).toBeDefined()
    })

    const deleteButtons = screen.getAllByRole('button', { name: 'מחיקה' })
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(deleteTaskInstanceMutateAsyncMock).toHaveBeenCalledWith('instance-1')
    })

    expect(schedulingRefetchMock).toHaveBeenCalled()
    confirmSpy.mockRestore()
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
