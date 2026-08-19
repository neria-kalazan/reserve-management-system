import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/activities/queries/use-activities', () => ({
  useActivityById: vi.fn(),
}))

vi.mock('@/features/activities/queries/use-activity-tasks', () => ({
  useActivityTaskInstances: vi.fn(),
  useAvailableUsers: vi.fn(),
  useCompanyUsers: vi.fn(),
  useCandidateEvaluation: vi.fn(),
  useTaskInstanceAssignments: vi.fn(),
  useTaskInstanceValidation: vi.fn(),
  useCreateTaskInstanceAssignment: vi.fn(),
  useCreateActivityTaskInstance: vi.fn(),
  useUpdateActivityTaskInstance: vi.fn(),
  useDeleteActivityTaskInstance: vi.fn(),
  useDeleteAssignment: vi.fn(),
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
import {
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
  useUpdateActivityTaskInstance,
} from '@/features/activities/queries/use-activity-tasks'
import { ActivityTaskInstancesPage } from '@/features/activities/pages/activity-task-instances-page'

const useActivityByIdMock = vi.mocked(useActivityById)
const useActivityTaskInstancesMock = vi.mocked(useActivityTaskInstances)
const useAvailableUsersMock = vi.mocked(useAvailableUsers)
const useCompanyUsersMock = vi.mocked(useCompanyUsers)
const useCandidateEvaluationMock = vi.mocked(useCandidateEvaluation)
const useTaskInstanceAssignmentsMock = vi.mocked(useTaskInstanceAssignments)
const useTaskInstanceValidationMock = vi.mocked(useTaskInstanceValidation)
const useCreateTaskInstanceAssignmentMock = vi.mocked(useCreateTaskInstanceAssignment)
const useCreateActivityTaskInstanceMock = vi.mocked(useCreateActivityTaskInstance)
const useUpdateActivityTaskInstanceMock = vi.mocked(useUpdateActivityTaskInstance)
const useDeleteActivityTaskInstanceMock = vi.mocked(useDeleteActivityTaskInstance)
const useDeleteAssignmentMock = vi.mocked(useDeleteAssignment)

describe('ActivityTaskInstancesPage', () => {
  beforeEach(() => {
    useParamsMock.mockReturnValue({ activityId: 'activity-1', taskId: 'task-1' })
    navigateMock.mockReset()
    useActivityByIdMock.mockReset()
    useActivityTaskInstancesMock.mockReset()
    useAvailableUsersMock.mockReset()
    useCompanyUsersMock.mockReset()
    useCandidateEvaluationMock.mockReset()
    useTaskInstanceAssignmentsMock.mockReset()
    useTaskInstanceValidationMock.mockReset()
    useCreateTaskInstanceAssignmentMock.mockReset()
    useCreateActivityTaskInstanceMock.mockReset()
    useUpdateActivityTaskInstanceMock.mockReset()
    useDeleteActivityTaskInstanceMock.mockReset()
    useDeleteAssignmentMock.mockReset()

    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: { id: 'activity-1', name: 'פעילות מבצעית', companyId: 'company-1' },
    } as unknown as ReturnType<typeof useActivityById>)

    useActivityTaskInstancesMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [
        {
          id: 'instance-1',
          activityTaskId: 'task-1',
          title: 'משמרת בוקר',
          startTime: '2026-08-01T09:00:00.000Z',
          endTime: '2026-08-01T17:00:00.000Z',
        },
      ],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityTaskInstances>)

    useAvailableUsersMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [
        {
          id: 'user-1',
          firstName: 'איילה',
          lastName: 'כהן',
          phone: '0500000000',
          email: 'a@example.com',
          personalNumber: '123456',
          isActive: true,
        },
      ],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useAvailableUsers>)

    useCompanyUsersMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [
        {
          id: 'user-1',
          firstName: 'איילה',
          lastName: 'כהן',
          phone: '0500000000',
          email: 'a@example.com',
          personalNumber: '123456',
          isActive: true,
          unit: null,
        },
        {
          id: 'user-2',
          firstName: 'רונית',
          lastName: 'לוי',
          phone: '0500000001',
          email: 'ronit@example.com',
          personalNumber: '654321',
          isActive: true,
          unit: { id: 'unit-1', name: 'יחידה 1', description: null, displayOrder: 1 },
        },
      ],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyUsers>)

    useCandidateEvaluationMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        userId: 'user-2',
        severity: 'WARNING',
        reasonCodes: ['QUALIFICATION_MISMATCH'],
        reasonMessages: ['כישורים לא תואמים את דרישות המשימה.'],
      },
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCandidateEvaluation>)

    useTaskInstanceAssignmentsMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useTaskInstanceAssignments>)

    useTaskInstanceValidationMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        requiredErrors: [],
        warnings: [],
        summary: { isValid: true },
      },
    } as unknown as ReturnType<typeof useTaskInstanceValidation>)

    useCreateTaskInstanceAssignmentMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
      isError: false,
      error: null,
      status: 'idle',
    } as unknown as ReturnType<typeof useCreateTaskInstanceAssignment>)

    useCreateActivityTaskInstanceMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    } as unknown as ReturnType<typeof useCreateActivityTaskInstance>)

    useUpdateActivityTaskInstanceMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateActivityTaskInstance>)

    useDeleteActivityTaskInstanceMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteActivityTaskInstance>)

    useDeleteAssignmentMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
      isError: false,
      error: null,
      status: 'idle',
    } as unknown as ReturnType<typeof useDeleteAssignment>)
  })

  it('creates a task instance with the datetime-local values expected by the backend contract', async () => {
    const createMutation = vi.fn().mockResolvedValue(undefined)
    useCreateActivityTaskInstanceMock.mockReturnValue({
      mutateAsync: createMutation,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateActivityTaskInstance>)

    render(<ActivityTaskInstancesPage />)

    fireEvent.change(screen.getByLabelText('שם המופע'), { target: { value: 'משמרת לילה' } })
    fireEvent.change(screen.getByLabelText('התחלה'), { target: { value: '2026-08-01T20:00' } })
    fireEvent.change(screen.getByLabelText('סיום'), { target: { value: '2026-08-02T04:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'יצירת מופע' }))

    await waitFor(() => {
      expect(createMutation).toHaveBeenCalledWith({
        title: 'משמרת לילה',
        startTime: '2026-08-01T20:00',
        endTime: '2026-08-02T04:00',
      })
    })
  })

  it('renders the valid validation state for a valid task instance', () => {
    render(<ActivityTaskInstancesPage />)

    expect(screen.getByText('תקין')).toBeTruthy()
  })

  it('renders required validation errors and warning messages separately for an invalid task instance', () => {
    useTaskInstanceValidationMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        requiredErrors: [{ type: 'MANPOWER', message: 'Missing required manpower' }],
        warnings: [{ type: 'AVAILABILITY', message: 'User is not available for this task time' }],
        summary: { isValid: false },
      },
    } as unknown as ReturnType<typeof useTaskInstanceValidation>)

    render(<ActivityTaskInstancesPage />)

    expect(screen.getByText('לא תקין')).toBeTruthy()
    expect(screen.getByText('Missing required manpower')).toBeTruthy()
    expect(screen.getByText('User is not available for this task time')).toBeTruthy()
  })

  it('renders the current assignment list when assignments exist', () => {
    useTaskInstanceAssignmentsMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [
        {
          id: 'assignment-1',
          taskInstanceId: 'instance-1',
          userId: 'user-1',
          createdBy: null,
          createdAt: '2026-08-01T09:00:00.000Z',
          updatedAt: '2026-08-01T09:00:00.000Z',
          user: {
            id: 'user-1',
            firstName: 'איילה',
            lastName: 'כהן',
            phone: '0500000000',
            email: 'a@example.com',
            personalNumber: '123456',
            isActive: true,
          },
        },
        {
          id: 'assignment-2',
          taskInstanceId: 'instance-1',
          userId: 'user-2',
          createdBy: null,
          createdAt: '2026-08-01T10:00:00.000Z',
          updatedAt: '2026-08-01T10:00:00.000Z',
          user: {
            id: 'user-2',
            firstName: 'רונית',
            lastName: 'לוי',
            phone: null,
            email: 'ronit@example.com',
            personalNumber: '654321',
            isActive: false,
          },
        },
      ],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useTaskInstanceAssignments>)

    render(<ActivityTaskInstancesPage />)

    expect(screen.getByText('שיבוצים נוכחיים')).toBeTruthy()
    expect(screen.getAllByText('איילה כהן').length).toBeGreaterThan(0)
    expect(screen.getAllByText('מספר אישי: 123456').length).toBeGreaterThan(0)
    expect(screen.getAllByText('רונית לוי').length).toBeGreaterThan(0)
    expect(screen.getAllByText('מספר אישי: 654321').length).toBeGreaterThan(0)
  })

  it('shows the loading state while assignment list is in flight', () => {
    useTaskInstanceAssignmentsMock.mockReturnValue({
      isPending: true,
      isError: false,
      data: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useTaskInstanceAssignments>)

    render(<ActivityTaskInstancesPage />)

    expect(screen.getByText('טוען שיבוצים')).toBeTruthy()
  })

  it('shows an error state and retry action when assignment loading fails', () => {
    const refetch = vi.fn()
    useTaskInstanceAssignmentsMock.mockReturnValue({
      isPending: false,
      isError: true,
      data: undefined,
      refetch,
    } as unknown as ReturnType<typeof useTaskInstanceAssignments>)

    render(<ActivityTaskInstancesPage />)

    expect(screen.getByText('טעינת שיבוצים נכשלה')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'ניסיון חוזר' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('shows an empty state when no current assignments are returned', () => {
    useTaskInstanceAssignmentsMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useTaskInstanceAssignments>)

    render(<ActivityTaskInstancesPage />)

    expect(screen.getByText('אין משתמשים מוקצים כרגע למופע הזה.')).toBeTruthy()
  })

  it('renders a delete action for each existing assignment and keeps the section read-only', () => {
    useTaskInstanceAssignmentsMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [
        {
          id: 'assignment-1',
          taskInstanceId: 'instance-1',
          userId: 'user-1',
          createdBy: null,
          createdAt: '2026-08-01T09:00:00.000Z',
          updatedAt: '2026-08-01T09:00:00.000Z',
          user: {
            id: 'user-1',
            firstName: 'איילה',
            lastName: 'כהן',
            phone: '0500000000',
            email: 'a@example.com',
            personalNumber: '123456',
            isActive: true,
          },
        },
      ],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useTaskInstanceAssignments>)

    render(<ActivityTaskInstancesPage />)

    expect(screen.getByText('שיבוצים נוכחיים')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'מחיקת שיבוץ' })).toBeTruthy()
    expect(screen.getByText('מועמדים זמינים')).toBeTruthy()

    const assignmentSection = screen.getByTestId('task-instance-assignments')
    expect(assignmentSection.querySelectorAll('button').length).toBe(1)
  })

  it('calls the existing delete mutation with the correct assignment id and preserves task-instance context', async () => {
    const deleteAssignmentMutation = vi.fn().mockResolvedValue(undefined)
    useDeleteAssignmentMock.mockReturnValue({
      mutateAsync: deleteAssignmentMutation,
      isPending: false,
      isError: false,
      error: null,
      status: 'idle',
    } as unknown as ReturnType<typeof useDeleteAssignment>)

    useTaskInstanceAssignmentsMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [
        {
          id: 'assignment-1',
          taskInstanceId: 'instance-1',
          userId: 'user-1',
          createdBy: null,
          createdAt: '2026-08-01T09:00:00.000Z',
          updatedAt: '2026-08-01T09:00:00.000Z',
          user: {
            id: 'user-1',
            firstName: 'איילה',
            lastName: 'כהן',
            phone: '0500000000',
            email: 'a@example.com',
            personalNumber: '123456',
            isActive: true,
          },
        },
      ],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useTaskInstanceAssignments>)

    render(<ActivityTaskInstancesPage />)

    fireEvent.click(screen.getByRole('button', { name: 'מחיקת שיבוץ' }))

    await waitFor(() => {
      expect(deleteAssignmentMutation).toHaveBeenCalledWith('assignment-1')
    })
  })

  it('shows a pending deletion state and prevents duplicate deletion clicks while the mutation is pending', async () => {
    const deleteAssignmentMutation = vi.fn().mockImplementation(() => new Promise(() => {}))
    useDeleteAssignmentMock.mockReturnValue({
      mutateAsync: deleteAssignmentMutation,
      isPending: true,
      isError: false,
      error: null,
      status: 'pending',
    } as unknown as ReturnType<typeof useDeleteAssignment>)

    useTaskInstanceAssignmentsMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [
        {
          id: 'assignment-1',
          taskInstanceId: 'instance-1',
          userId: 'user-1',
          createdBy: null,
          createdAt: '2026-08-01T09:00:00.000Z',
          updatedAt: '2026-08-01T09:00:00.000Z',
          user: {
            id: 'user-1',
            firstName: 'איילה',
            lastName: 'כהן',
            phone: '0500000000',
            email: 'a@example.com',
            personalNumber: '123456',
            isActive: true,
          },
        },
      ],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useTaskInstanceAssignments>)

    render(<ActivityTaskInstancesPage />)

    const deleteButton = screen.getByRole('button', { name: 'מוחק…' })
    expect(deleteButton).toBeTruthy()
    expect(deleteButton.hasAttribute('disabled')).toBe(true)
  })

  it('renders a failed delete state without removing the assignment from the current list', async () => {
    const deleteAssignmentMutation = vi.fn().mockRejectedValue(new Error('Delete failed'))
    useDeleteAssignmentMock.mockReturnValue({
      mutateAsync: deleteAssignmentMutation,
      isPending: false,
      isError: false,
      error: null,
      status: 'idle',
    } as unknown as ReturnType<typeof useDeleteAssignment>)

    useTaskInstanceAssignmentsMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [
        {
          id: 'assignment-1',
          taskInstanceId: 'instance-1',
          userId: 'user-1',
          createdBy: null,
          createdAt: '2026-08-01T09:00:00.000Z',
          updatedAt: '2026-08-01T09:00:00.000Z',
          user: {
            id: 'user-1',
            firstName: 'איילה',
            lastName: 'כהן',
            phone: '0500000000',
            email: 'a@example.com',
            personalNumber: '123456',
            isActive: true,
          },
        },
      ],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useTaskInstanceAssignments>)

    render(<ActivityTaskInstancesPage />)

    fireEvent.click(screen.getByRole('button', { name: 'מחיקת שיבוץ' }))

    await waitFor(() => {
      expect(screen.getByText('מחיקת השיבוץ נכשלה')).toBeTruthy()
      expect(screen.getAllByText('איילה כהן').length).toBeGreaterThan(0)
    })
  })

  it('shows the loading state while validation is in flight', () => {
    useTaskInstanceValidationMock.mockReturnValue({
      isPending: true,
      isError: false,
      data: undefined,
    } as unknown as ReturnType<typeof useTaskInstanceValidation>)

    render(<ActivityTaskInstancesPage />)

    expect(screen.getByText('בודק תקינות…')).toBeTruthy()
  })

  it('shows an error state when the validation request fails and never marks it as valid', () => {
    useTaskInstanceValidationMock.mockReturnValue({
      isPending: false,
      isError: true,
      data: undefined,
    } as unknown as ReturnType<typeof useTaskInstanceValidation>)

    render(<ActivityTaskInstancesPage />)

    expect(screen.getByText('בדיקת תקינות נכשלה')).toBeTruthy()
    expect(screen.queryByText('תקין')).toBeNull()
  })

  it('shows loading while available candidates are loading', () => {
    useAvailableUsersMock.mockReturnValue({
      isPending: true,
      isError: false,
      data: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useAvailableUsers>)

    render(<ActivityTaskInstancesPage />)

    expect(screen.getByText('טוען מועמדים')).toBeTruthy()
  })

  it('shows an error state and retry action when available-candidate loading fails', () => {
    const refetch = vi.fn()
    useAvailableUsersMock.mockReturnValue({
      isPending: false,
      isError: true,
      data: undefined,
      refetch,
    } as unknown as ReturnType<typeof useAvailableUsers>)

    render(<ActivityTaskInstancesPage />)

    expect(screen.getByText('טעינת מועמדים נכשלה')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'ניסיון חוזר' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('shows an empty state when no available candidates are returned by the backend', () => {
    useAvailableUsersMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useAvailableUsers>)

    render(<ActivityTaskInstancesPage />)

    expect(screen.getByText('אין מועמדים זמינים כרגע עבור המופע הזה.')).toBeTruthy()
  })

  it('renders the backend-returned normal candidates as-is', () => {
    useAvailableUsersMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [
        {
          id: 'user-1',
          firstName: 'איילה',
          lastName: 'כהן',
          phone: '0500000000',
          email: 'a@example.com',
          personalNumber: '123456',
          isActive: true,
        },
        {
          id: 'user-2',
          firstName: 'מיכל',
          lastName: 'לוי',
          phone: '0500000001',
          email: 'm@example.com',
          personalNumber: '654321',
          isActive: false,
        },
      ],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useAvailableUsers>)

    render(<ActivityTaskInstancesPage />)

    expect(screen.getAllByText('איילה כהן').length).toBeGreaterThan(0)
    expect(screen.getAllByText('מיכל לוי').length).toBeGreaterThan(0)
    expect(screen.getAllByText('מספר אישי: 123456').length).toBeGreaterThan(0)
    expect(screen.getAllByText('מספר אישי: 654321').length).toBeGreaterThan(0)
  })

  it('renders the autocomplete and supports local filtering for company users', () => {
    render(<ActivityTaskInstancesPage />)

    expect(screen.getByLabelText('חיפוש מועמד')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('חיפוש מועמד'), { target: { value: 'רונית' } })
    expect(screen.getAllByText('רונית לוי').length).toBeGreaterThan(0)
    expect(screen.queryByText('איילה כהן')).not.toBeNull()
  })

  it('shows a no-match state when the local search has no company-user results', () => {
    render(<ActivityTaskInstancesPage />)

    fireEvent.change(screen.getByLabelText('חיפוש מועמד'), { target: { value: 'לא קיים' } })
    expect(screen.getByText('לא נמצאו משתמשים התואמים את החיפוש.')).toBeTruthy()
  })

  it('requests candidate evaluation only after a user is selected and renders the returned warning state', async () => {
    const evaluationRefetch = vi.fn()
    useCandidateEvaluationMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        userId: 'user-2',
        severity: 'WARNING',
        reasonCodes: ['QUALIFICATION_MISMATCH'],
        reasonMessages: ['כישורים לא תואמים את דרישות המשימה.', 'המשתמש מחוץ לרשימת המועמדים הראשונית.'],
      },
      refetch: evaluationRefetch,
    } as unknown as ReturnType<typeof useCandidateEvaluation>)

    render(<ActivityTaskInstancesPage />)

    expect(screen.queryByText('אזהרה')).toBeNull()
    fireEvent.change(screen.getByLabelText('חיפוש מועמד'), { target: { value: 'רונית' } })
    fireEvent.click(screen.getByRole('button', { name: 'בחר רונית לוי' }))

    await waitFor(() => {
      expect(screen.getByText('אזהרה')).toBeTruthy()
    })
    expect(screen.getByText('כישורים לא תואמים את דרישות המשימה.')).toBeTruthy()
    expect(screen.getByText('המשתמש מחוץ לרשימת המועמדים הראשונית.')).toBeTruthy()
  })

  it('renders the loading and error states for candidate evaluation and supports retry', async () => {
    const evaluationRefetch = vi.fn()
    const { rerender } = render(<ActivityTaskInstancesPage />)

    fireEvent.change(screen.getByLabelText('חיפוש מועמד'), { target: { value: 'רונית' } })

    useCandidateEvaluationMock.mockReturnValue({
      isPending: true,
      isError: false,
      data: undefined,
      refetch: evaluationRefetch,
    } as unknown as ReturnType<typeof useCandidateEvaluation>)

    rerender(<ActivityTaskInstancesPage />)
    fireEvent.click(screen.getByRole('button', { name: 'בחר רונית לוי' }))

    expect(screen.getByText('בודק הערכת מועמד…')).toBeTruthy()

    useCandidateEvaluationMock.mockReturnValue({
      isPending: false,
      isError: true,
      data: undefined,
      refetch: evaluationRefetch,
    } as unknown as ReturnType<typeof useCandidateEvaluation>)

    rerender(<ActivityTaskInstancesPage />)

    expect(screen.getByText('הערכת מועמד נכשלה')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'ניסיון חוזר' }))
    expect(evaluationRefetch).toHaveBeenCalledTimes(1)
  })

  it('renders NORMAL and CRITICAL evaluation states and can replace the selected candidate', async () => {
    const evaluationRefetch = vi.fn()
    const { rerender } = render(<ActivityTaskInstancesPage />)

    fireEvent.change(screen.getByLabelText('חיפוש מועמד'), { target: { value: 'רונית' } })
    useCandidateEvaluationMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        userId: 'user-2',
        severity: 'CRITICAL',
        reasonCodes: ['INELIGIBLE'],
        reasonMessages: ['המשתמש לא עומד בדרישות המינימום.'],
      },
      refetch: evaluationRefetch,
    } as unknown as ReturnType<typeof useCandidateEvaluation>)

    rerender(<ActivityTaskInstancesPage />)
    fireEvent.click(screen.getByRole('button', { name: 'בחר רונית לוי' }))
    expect(screen.getByText('קריטי')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'סילוק בחירה' }))
    expect(screen.queryByText('מועמד נבחר')).toBeNull()

    useCandidateEvaluationMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        userId: 'user-1',
        severity: 'NORMAL',
        reasonCodes: [],
        reasonMessages: [],
      },
      refetch: evaluationRefetch,
    } as unknown as ReturnType<typeof useCandidateEvaluation>)

    rerender(<ActivityTaskInstancesPage />)
    fireEvent.change(screen.getByLabelText('חיפוש מועמד'), { target: { value: 'איילה' } })
    fireEvent.click(screen.getByRole('button', { name: 'בחר איילה כהן' }))
    await waitFor(() => {
      expect(screen.getAllByText('תקין').length).toBeGreaterThan(0)
    })
  })

  it('does not show an assign action before a user is selected and shows it after a valid evaluation', async () => {
    render(<ActivityTaskInstancesPage />)

    expect(screen.queryByRole('button', { name: 'הקצה מועמד' })).toBeNull()

    fireEvent.change(screen.getByLabelText('חיפוש מועמד'), { target: { value: 'רונית' } })
    fireEvent.click(screen.getByRole('button', { name: 'בחר רונית לוי' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'הקצה מועמד' })).toBeTruthy()
    })
  })

  it('invokes the existing assignment mutation with the correct task instance and user when the user clicks Assign', async () => {
    const createAssignmentMutation = vi.fn().mockResolvedValue(undefined)
    useCreateTaskInstanceAssignmentMock.mockReturnValue({
      mutateAsync: createAssignmentMutation,
      isPending: false,
      isError: false,
      error: null,
      status: 'idle',
    } as unknown as ReturnType<typeof useCreateTaskInstanceAssignment>)

    render(<ActivityTaskInstancesPage />)

    fireEvent.change(screen.getByLabelText('חיפוש מועמד'), { target: { value: 'רונית' } })
    fireEvent.click(screen.getByRole('button', { name: 'בחר רונית לוי' }))
    fireEvent.click(screen.getByRole('button', { name: 'הקצה מועמד' }))

    await waitFor(() => {
      expect(createAssignmentMutation).toHaveBeenCalledWith({ userId: 'user-2' })
    })
  })

  it('does not trigger assignment mutations merely by selecting a candidate', () => {
    const createAssignmentMutation = vi.fn().mockResolvedValue(undefined)
    useCreateTaskInstanceAssignmentMock.mockReturnValue({
      mutateAsync: createAssignmentMutation,
      isPending: false,
      isError: false,
      error: null,
      status: 'idle',
    } as unknown as ReturnType<typeof useCreateTaskInstanceAssignment>)

    render(<ActivityTaskInstancesPage />)

    fireEvent.change(screen.getByLabelText('חיפוש מועמד'), { target: { value: 'רונית' } })
    fireEvent.click(screen.getByRole('button', { name: 'בחר רונית לוי' }))

    expect(createAssignmentMutation).not.toHaveBeenCalled()
  })

  it('shows the pending state and prevents duplicate clicks while assignment is in flight', async () => {
    const createAssignmentMutation = vi.fn().mockImplementation(() => new Promise(() => {}))
    useCreateTaskInstanceAssignmentMock.mockReturnValue({
      mutateAsync: createAssignmentMutation,
      isPending: true,
      isError: false,
      error: null,
      status: 'pending',
    } as unknown as ReturnType<typeof useCreateTaskInstanceAssignment>)

    render(<ActivityTaskInstancesPage />)

    fireEvent.change(screen.getByLabelText('חיפוש מועמד'), { target: { value: 'רונית' } })
    fireEvent.click(screen.getByRole('button', { name: 'בחר רונית לוי' }))

    const assignButton = screen.getByRole('button', { name: 'הקצה מועמד' })
    expect(assignButton.hasAttribute('disabled')).toBe(true)
  })

  it('renders success and error states around an assignment attempt without clearing the selected user or evaluation', async () => {
    const createAssignmentMutation = vi.fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Assignment failed'))
    useCreateTaskInstanceAssignmentMock.mockReturnValue({
      mutateAsync: createAssignmentMutation,
      isPending: false,
      isError: false,
      error: null,
      status: 'idle',
    } as unknown as ReturnType<typeof useCreateTaskInstanceAssignment>)

    render(<ActivityTaskInstancesPage />)

    fireEvent.change(screen.getByLabelText('חיפוש מועמד'), { target: { value: 'רונית' } })
    fireEvent.click(screen.getByRole('button', { name: 'בחר רונית לוי' }))

    fireEvent.click(screen.getByRole('button', { name: 'הקצה מועמד' }))
    await waitFor(() => {
      expect(screen.getByText('ההקצאה הצליחה')).toBeTruthy()
    })
    expect(screen.getAllByText('רונית לוי').length).toBeGreaterThan(0)
    expect(screen.getByText('אזהרה')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'הקצה מועמד' }))
    await waitFor(() => {
      expect(screen.getAllByText('הקצאת המועמד נכשלה').length).toBeGreaterThan(0)
    })
    expect(screen.getAllByText('רונית לוי').length).toBeGreaterThan(0)
    expect(screen.getByText('אזהרה')).toBeTruthy()
  })

  it('allows assignment for WARNING and CRITICAL severity without frontend blocking', async () => {
    const warningMutation = vi.fn().mockResolvedValue(undefined)
    useCreateTaskInstanceAssignmentMock.mockReturnValue({
      mutateAsync: warningMutation,
      isPending: false,
      isError: false,
      error: null,
      status: 'idle',
    } as unknown as ReturnType<typeof useCreateTaskInstanceAssignment>)

    useCandidateEvaluationMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        userId: 'user-2',
        severity: 'WARNING',
        reasonCodes: ['MISMATCH'],
        reasonMessages: ['שגיאת הערכה'],
      },
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCandidateEvaluation>)

    const { unmount } = render(<ActivityTaskInstancesPage />)
    fireEvent.change(screen.getByLabelText('חיפוש מועמד'), { target: { value: 'רונית' } })
    fireEvent.click(screen.getByRole('button', { name: 'בחר רונית לוי' }))
    fireEvent.click(screen.getByRole('button', { name: 'הקצה מועמד' }))

    await waitFor(() => {
      expect(warningMutation).toHaveBeenCalledWith({ userId: 'user-2' })
    })

    unmount()
    useCandidateEvaluationMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        userId: 'user-2',
        severity: 'CRITICAL',
        reasonCodes: ['ELIGIBILITY'],
        reasonMessages: ['לא עומד בדרישות'],
      },
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCandidateEvaluation>)

    render(<ActivityTaskInstancesPage />)
    fireEvent.change(screen.getByLabelText('חיפוש מועמד'), { target: { value: 'רונית' } })
    fireEvent.click(screen.getByRole('button', { name: 'בחר רונית לוי' }))
    fireEvent.click(screen.getByRole('button', { name: 'הקצה מועמד' }))

    await waitFor(() => {
      expect(warningMutation).toHaveBeenCalledTimes(2)
    })
  })

  it('asks for confirmation before deleting a task instance and keeps the user in the flow', async () => {
    const deleteMutation = vi.fn().mockResolvedValue(undefined)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    useDeleteActivityTaskInstanceMock.mockReturnValue({
      mutateAsync: deleteMutation,
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteActivityTaskInstance>)

    render(<ActivityTaskInstancesPage />)

    fireEvent.click(screen.getByRole('button', { name: 'מחיקה' }))

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledTimes(1)
    })
    expect(deleteMutation).toHaveBeenCalledTimes(1)
  })

  it('offers navigation back to the task and back to the activity', () => {
    render(<ActivityTaskInstancesPage />)

    fireEvent.click(screen.getByRole('button', { name: 'חזרה למשימה' }))
    expect(navigateMock).toHaveBeenCalledWith('/activities/activity-1')

    fireEvent.click(screen.getByRole('button', { name: 'חזרה לפרטי פעילות' }))
    expect(navigateMock).toHaveBeenCalledWith('/activities/activity-1')
  })
})
