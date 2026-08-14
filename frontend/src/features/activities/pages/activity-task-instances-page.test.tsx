import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/activities/queries/use-activities', () => ({
  useActivityById: vi.fn(),
}))

vi.mock('@/features/activities/queries/use-activity-tasks', () => ({
  useActivityTaskInstances: vi.fn(),
  useTaskInstanceValidation: vi.fn(),
  useCreateActivityTaskInstance: vi.fn(),
  useUpdateActivityTaskInstance: vi.fn(),
  useDeleteActivityTaskInstance: vi.fn(),
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
  useCreateActivityTaskInstance,
  useDeleteActivityTaskInstance,
  useTaskInstanceValidation,
  useUpdateActivityTaskInstance,
} from '@/features/activities/queries/use-activity-tasks'
import { ActivityTaskInstancesPage } from '@/features/activities/pages/activity-task-instances-page'

const useActivityByIdMock = vi.mocked(useActivityById)
const useActivityTaskInstancesMock = vi.mocked(useActivityTaskInstances)
const useTaskInstanceValidationMock = vi.mocked(useTaskInstanceValidation)
const useCreateActivityTaskInstanceMock = vi.mocked(useCreateActivityTaskInstance)
const useUpdateActivityTaskInstanceMock = vi.mocked(useUpdateActivityTaskInstance)
const useDeleteActivityTaskInstanceMock = vi.mocked(useDeleteActivityTaskInstance)

describe('ActivityTaskInstancesPage', () => {
  beforeEach(() => {
    useParamsMock.mockReturnValue({ activityId: 'activity-1', taskId: 'task-1' })
    navigateMock.mockReset()
    useActivityByIdMock.mockReset()
    useActivityTaskInstancesMock.mockReset()
    useTaskInstanceValidationMock.mockReset()
    useCreateActivityTaskInstanceMock.mockReset()
    useUpdateActivityTaskInstanceMock.mockReset()
    useDeleteActivityTaskInstanceMock.mockReset()

    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: { id: 'activity-1', name: 'תעסוקה מבצעית', companyId: 'company-1' },
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

    useTaskInstanceValidationMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        requiredErrors: [],
        warnings: [],
        summary: { isValid: true },
      },
    } as unknown as ReturnType<typeof useTaskInstanceValidation>)

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

    fireEvent.click(screen.getByRole('button', { name: 'חזרה לפרטי תעסוקה' }))
    expect(navigateMock).toHaveBeenCalledWith('/activities/activity-1')
  })
})
