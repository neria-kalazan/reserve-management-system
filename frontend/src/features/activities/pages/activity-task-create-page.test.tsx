import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/activities/api/activity-tasks', () => ({
  updateActivityTaskRequirements: vi.fn(),
}))

vi.mock('@/features/activities/queries/use-activities', () => ({
  useActivityById: vi.fn(),
}))

vi.mock('@/features/activities/queries/use-activity-tasks', () => ({
  useActivityTaskById: vi.fn(),
  useActivityTaskRequirements: vi.fn(),
  useCreateActivityTask: vi.fn(),
  useUpdateActivityTask: vi.fn(),
  useUpdateActivityTaskRequirements: vi.fn(),
}))

vi.mock('@/features/roles/queries/use-roles', () => ({
  useCompanyRoles: vi.fn(),
}))

vi.mock('@/features/qualifications/queries/use-qualifications', () => ({
  useCompanyQualifications: vi.fn(),
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

import { updateActivityTaskRequirements } from '@/features/activities/api/activity-tasks'
import { useActivityById } from '@/features/activities/queries/use-activities'
import {
  useActivityTaskById,
  useActivityTaskRequirements,
  useCreateActivityTask,
  useUpdateActivityTask,
  useUpdateActivityTaskRequirements,
} from '@/features/activities/queries/use-activity-tasks'
import { useCompanyQualifications } from '@/features/qualifications/queries/use-qualifications'
import { useCompanyRoles } from '@/features/roles/queries/use-roles'
import { ActivityTaskCreatePage } from '@/features/activities/pages/activity-task-create-page'

const useActivityByIdMock = vi.mocked(useActivityById)
const useActivityTaskByIdMock = vi.mocked(useActivityTaskById)
const useActivityTaskRequirementsMock = vi.mocked(useActivityTaskRequirements)
const useCompanyRolesMock = vi.mocked(useCompanyRoles)
const useCompanyQualificationsMock = vi.mocked(useCompanyQualifications)
const useCreateActivityTaskMock = vi.mocked(useCreateActivityTask)
const useUpdateActivityTaskMock = vi.mocked(useUpdateActivityTask)
const useUpdateActivityTaskRequirementsMock = vi.mocked(useUpdateActivityTaskRequirements)
const updateActivityTaskRequirementsMock = vi.mocked(updateActivityTaskRequirements)

describe('ActivityTaskCreatePage', () => {
  beforeEach(() => {
    useActivityByIdMock.mockReset()
    useActivityTaskByIdMock.mockReset()
    useActivityTaskRequirementsMock.mockReset()
    useCompanyRolesMock.mockReset()
    useCompanyQualificationsMock.mockReset()
    useCreateActivityTaskMock.mockReset()
    useUpdateActivityTaskMock.mockReset()
    useUpdateActivityTaskRequirementsMock.mockReset()
    updateActivityTaskRequirementsMock.mockReset()
    navigateMock.mockReset()
    useParamsMock.mockReset()
    useParamsMock.mockReturnValue({ activityId: 'activity-1' })

    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: { id: 'activity-1', companyId: 'company-1', name: 'פעילות מבצעית' },
    } as unknown as ReturnType<typeof useActivityById>)

    useCompanyRolesMock.mockReturnValue({
      data: {
        items: [
          { id: 'role-1', name: 'מפקד', description: null },
          { id: 'role-2', name: 'נהג', description: null },
        ],
        total: 2,
        page: 1,
        pageSize: 50,
      },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyRoles>)

    useCompanyQualificationsMock.mockReturnValue({
      data: {
        items: [
          { id: 'qual-1', name: 'רישיון נהיגה', description: null },
          { id: 'qual-2', name: 'כושר גופני', description: null },
        ],
        total: 2,
        page: 1,
        pageSize: 50,
      },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyQualifications>)
  })

  it('renders the create task form from paginated role and qualification query results', () => {
    useCreateActivityTaskMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useCreateActivityTask>)

    render(<ActivityTaskCreatePage />)

    fireEvent.click(screen.getByRole('button', { name: 'הוספת תפקיד' }))
    expect(screen.getByRole('dialog', { name: 'בחירת תפקידים' })).toBeDefined()
    expect(screen.getByLabelText('מפקד')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'ביטול' }))

    fireEvent.click(screen.getByRole('button', { name: 'הוספת הסמכה' }))
    expect(screen.getByRole('dialog', { name: 'בחירת הסמכות' })).toBeDefined()
    expect(screen.getByLabelText('רישיון נהיגה')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'ביטול' }))

    expect(screen.getByRole('heading', { name: 'יצירת משימה' })).toBeDefined()
    expect(screen.getByLabelText('שם המשימה')).toBeDefined()
    expect(screen.getByLabelText('תיאור')).toBeDefined()
  })

  it('validates required name before submission', async () => {
    const mutateAsync = vi.fn()
    useCreateActivityTaskMock.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateActivityTask>)

    render(<ActivityTaskCreatePage />)

    fireEvent.click(screen.getByRole('button', { name: 'יצירת משימה' }))

    await waitFor(() => expect(screen.getByText('יש להזין שם משימה.')).toBeDefined())
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('submits the correct payload and navigates back to activity details on success', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ id: 'task-1' })
    useCreateActivityTaskMock.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateActivityTask>)

    render(<ActivityTaskCreatePage />)

    fireEvent.change(screen.getByLabelText('שם המשימה'), { target: { value: 'הכנה' } })
    fireEvent.change(screen.getByLabelText('תיאור'), { target: { value: 'בדיקת ציוד' } })
    fireEvent.click(screen.getByRole('button', { name: 'יצירת משימה' }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(mutateAsync).toHaveBeenCalledWith({
      name: 'הכנה',
      description: 'בדיקת ציוד',
    })
    expect(navigateMock).toHaveBeenCalledWith('/activities/activity-1/tasks')
  })

  it('keeps values entered after backend rejection', async () => {
    const mutateAsync = vi.fn().mockRejectedValue({ status: 400, message: 'invalid' })
    useCreateActivityTaskMock.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateActivityTask>)

    render(<ActivityTaskCreatePage />)

    fireEvent.change(screen.getByLabelText('שם המשימה'), { target: { value: 'הכנה' } })
    fireEvent.change(screen.getByLabelText('תיאור'), { target: { value: 'בדיקת ציוד' } })
    fireEvent.click(screen.getByRole('button', { name: 'יצירת משימה' }))

    await waitFor(() => expect(screen.getByText('השמירה נכשלה')).toBeDefined())
    expect(screen.getByDisplayValue('הכנה')).toBeDefined()
    expect(screen.getByDisplayValue('בדיקת ציוד')).toBeDefined()
  })

  it('supports cancel/back navigation without submitting', async () => {
    const mutateAsync = vi.fn()
    useCreateActivityTaskMock.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateActivityTask>)

    render(<ActivityTaskCreatePage />)

    const cancelButtons = screen.getAllByRole('button', { name: 'ביטול' })
    const cancelButton = cancelButtons[0]
    expect(cancelButton).toBeDefined()
    fireEvent.click(cancelButton as HTMLElement)
    expect(navigateMock).toHaveBeenCalledWith('/activities/activity-1')
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('loads the selected task in edit mode and saves both metadata and requirements', async () => {
    useParamsMock.mockReturnValue({ activityId: 'activity-1', taskId: 'task-1' })
    useActivityTaskByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: { id: 'task-1', name: 'הכנה', description: 'בדיקת ציוד', activityId: 'activity-1' },
    } as unknown as ReturnType<typeof useActivityTaskById>)
    useActivityTaskRequirementsMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        manpower: { required: true, quantity: 2 },
        roles: [{ roleId: 'role-1', required: true, quantity: 1 }],
        qualifications: [{ qualificationId: 'qual-1', required: false, quantity: 1 }],
      },
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityTaskRequirements>)

    const updateTaskMutation = vi.fn().mockResolvedValue(undefined)
    const updateRequirementsMutation = vi.fn().mockResolvedValue(undefined)
    useUpdateActivityTaskMock.mockReturnValue({
      mutateAsync: updateTaskMutation,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateActivityTask>)
    useUpdateActivityTaskRequirementsMock.mockReturnValue({
      mutateAsync: updateRequirementsMutation,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateActivityTaskRequirements>)

    render(<ActivityTaskCreatePage />)

    fireEvent.change(screen.getByLabelText('שם המשימה'), { target: { value: 'הכנה מעודכנת' } })
    fireEvent.click(screen.getByRole('button', { name: 'שמירת משימה' }))

    await waitFor(() => expect(updateTaskMutation).toHaveBeenCalledWith({
      name: 'הכנה מעודכנת',
      description: 'בדיקת ציוד',
    }))

    await waitFor(() => expect(updateRequirementsMutation).toHaveBeenCalledWith({
      manpower: { required: true, quantity: 2 },
      roles: [{ roleId: 'role-1', required: true, quantity: 1 }],
      qualifications: [{ qualificationId: 'qual-1', required: false, quantity: 1 }],
    }))

    expect(navigateMock).toHaveBeenCalledWith('/activities/activity-1/tasks')
  })

  it('opens the role selection modal, allows multi-select, and confirms roles into the form', async () => {
    const createTaskMutation = vi.fn().mockResolvedValue({ id: 'task-1' })
    updateActivityTaskRequirementsMock.mockResolvedValue(undefined)
    useCreateActivityTaskMock.mockReturnValue({
      mutateAsync: createTaskMutation,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateActivityTask>)

    render(<ActivityTaskCreatePage />)

    fireEvent.change(screen.getByLabelText('שם המשימה'), { target: { value: 'הכנה' } })
    fireEvent.click(screen.getByRole('button', { name: 'הוספת תפקיד' }))

    expect(screen.getByRole('dialog', { name: 'בחירת תפקידים' })).toBeDefined()
    expect(screen.getByLabelText('מפקד')).toBeDefined()
    expect(screen.getByLabelText('נהג')).toBeDefined()

    fireEvent.click(screen.getByLabelText('מפקד'))
    fireEvent.click(screen.getByLabelText('נהג'))
    fireEvent.click(screen.getByRole('button', { name: 'אישור' }))

    fireEvent.click(screen.getByRole('button', { name: 'יצירת משימה' }))

    await waitFor(() => expect(updateActivityTaskRequirementsMock).toHaveBeenCalledWith('task-1', {
      manpower: { required: false, quantity: 0 },
      roles: [
        { roleId: 'role-1', required: true, quantity: 1 },
        { roleId: 'role-2', required: true, quantity: 1 },
      ],
      qualifications: [],
    }))
  })

  it('opens the qualification selection modal, allows multi-select, and confirms qualifications into the form', async () => {
    const createTaskMutation = vi.fn().mockResolvedValue({ id: 'task-1' })
    updateActivityTaskRequirementsMock.mockResolvedValue(undefined)
    useCreateActivityTaskMock.mockReturnValue({
      mutateAsync: createTaskMutation,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateActivityTask>)

    render(<ActivityTaskCreatePage />)

    fireEvent.change(screen.getByLabelText('שם המשימה'), { target: { value: 'הכנה' } })
    fireEvent.click(screen.getByRole('button', { name: 'הוספת הסמכה' }))

    expect(screen.getByRole('dialog', { name: 'בחירת הסמכות' })).toBeDefined()
    expect(screen.getByLabelText('רישיון נהיגה')).toBeDefined()
    expect(screen.getByLabelText('כושר גופני')).toBeDefined()

    fireEvent.click(screen.getByLabelText('רישיון נהיגה'))
    fireEvent.click(screen.getByLabelText('כושר גופני'))
    fireEvent.click(screen.getByRole('button', { name: 'אישור' }))

    fireEvent.click(screen.getByRole('button', { name: 'יצירת משימה' }))

    await waitFor(() => expect(updateActivityTaskRequirementsMock).toHaveBeenCalledWith('task-1', {
      manpower: { required: false, quantity: 0 },
      roles: [],
      qualifications: [
        { qualificationId: 'qual-1', required: true, quantity: 1 },
        { qualificationId: 'qual-2', required: true, quantity: 1 },
      ],
    }))
  })

  it('preserves existing selections in edit mode and removes deselected options from the pending form state', async () => {
    useParamsMock.mockReturnValue({ activityId: 'activity-1', taskId: 'task-1' })
    useActivityTaskByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: { id: 'task-1', name: 'הכנה', description: 'בדיקת ציוד', activityId: 'activity-1' },
    } as unknown as ReturnType<typeof useActivityTaskById>)
    useActivityTaskRequirementsMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        manpower: { required: true, quantity: 2 },
        roles: [{ roleId: 'role-1', required: true, quantity: 1 }],
        qualifications: [{ qualificationId: 'qual-1', required: false, quantity: 1 }],
      },
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityTaskRequirements>)

    const updateTaskMutation = vi.fn().mockResolvedValue(undefined)
    const updateRequirementsMutation = vi.fn().mockResolvedValue(undefined)
    useUpdateActivityTaskMock.mockReturnValue({
      mutateAsync: updateTaskMutation,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateActivityTask>)
    useUpdateActivityTaskRequirementsMock.mockReturnValue({
      mutateAsync: updateRequirementsMutation,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateActivityTaskRequirements>)

    render(<ActivityTaskCreatePage />)

    fireEvent.click(screen.getByRole('button', { name: 'הוספת תפקיד' }))
    expect((screen.getByLabelText('מפקד') as HTMLInputElement).checked).toBe(true)
    fireEvent.click(screen.getByLabelText('מפקד'))
    fireEvent.click(screen.getByRole('button', { name: 'אישור' }))

    fireEvent.click(screen.getByRole('button', { name: 'הוספת הסמכה' }))
    expect((screen.getByLabelText('רישיון נהיגה') as HTMLInputElement).checked).toBe(true)
    fireEvent.click(screen.getByLabelText('רישיון נהיגה'))
    fireEvent.click(screen.getByRole('button', { name: 'אישור' }))

    fireEvent.click(screen.getByRole('button', { name: 'שמירת משימה' }))

    await waitFor(() => expect(updateRequirementsMutation).toHaveBeenCalledWith({
      manpower: { required: true, quantity: 2 },
      roles: [],
      qualifications: [],
    }))
  })

  it('allows selected roles to be switched between required and optional', async () => {
    const createTaskMutation = vi.fn().mockResolvedValue({ id: 'task-1' })
    updateActivityTaskRequirementsMock.mockResolvedValue(undefined)
    useCreateActivityTaskMock.mockReturnValue({
      mutateAsync: createTaskMutation,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateActivityTask>)

    render(<ActivityTaskCreatePage />)

    fireEvent.change(screen.getByLabelText('שם המשימה'), { target: { value: 'הכנה' } })
    fireEvent.click(screen.getByRole('button', { name: 'הוספת תפקיד' }))
    fireEvent.click(screen.getByLabelText('מפקד'))
    fireEvent.click(screen.getByRole('button', { name: 'אישור' }))

    expect(screen.getAllByText('מפקד').length).toBeGreaterThan(0)
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'הכרחי' })[0])

    fireEvent.click(screen.getByRole('button', { name: 'יצירת משימה' }))

    await waitFor(() => expect(updateActivityTaskRequirementsMock).toHaveBeenCalledWith('task-1', {
      manpower: { required: false, quantity: 0 },
      roles: [{ roleId: 'role-1', required: false, quantity: 1 }],
      qualifications: [],
    }))
  })

  it('allows selected qualifications to be switched between required and optional', async () => {
    const createTaskMutation = vi.fn().mockResolvedValue({ id: 'task-1' })
    updateActivityTaskRequirementsMock.mockResolvedValue(undefined)
    useCreateActivityTaskMock.mockReturnValue({
      mutateAsync: createTaskMutation,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateActivityTask>)

    render(<ActivityTaskCreatePage />)

    fireEvent.change(screen.getByLabelText('שם המשימה'), { target: { value: 'הכנה' } })
    fireEvent.click(screen.getByRole('button', { name: 'הוספת הסמכה' }))
    fireEvent.click(screen.getByLabelText('רישיון נהיגה'))
    fireEvent.click(screen.getByRole('button', { name: 'אישור' }))

    expect(screen.getAllByText('רישיון נהיגה').length).toBeGreaterThan(0)
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'הכרחי' })[0])

    fireEvent.click(screen.getByRole('button', { name: 'יצירת משימה' }))

    await waitFor(() => expect(updateActivityTaskRequirementsMock).toHaveBeenCalledWith('task-1', {
      manpower: { required: false, quantity: 0 },
      roles: [],
      qualifications: [{ qualificationId: 'qual-1', required: false, quantity: 1 }],
    }))
  })

  it('loads and persists required/optional state in edit mode', async () => {
    useParamsMock.mockReturnValue({ activityId: 'activity-1', taskId: 'task-1' })
    useActivityTaskByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: { id: 'task-1', name: 'הכנה', description: 'בדיקת ציוד', activityId: 'activity-1' },
    } as unknown as ReturnType<typeof useActivityTaskById>)
    useActivityTaskRequirementsMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        manpower: { required: true, quantity: 2 },
        roles: [{ roleId: 'role-1', required: true, quantity: 1 }],
        qualifications: [{ qualificationId: 'qual-1', required: false, quantity: 1 }],
      },
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityTaskRequirements>)

    const updateTaskMutation = vi.fn().mockResolvedValue(undefined)
    const updateRequirementsMutation = vi.fn().mockResolvedValue(undefined)
    useUpdateActivityTaskMock.mockReturnValue({
      mutateAsync: updateTaskMutation,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateActivityTask>)
    useUpdateActivityTaskRequirementsMock.mockReturnValue({
      mutateAsync: updateRequirementsMutation,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateActivityTaskRequirements>)

    render(<ActivityTaskCreatePage />)

    expect(screen.getAllByText('מפקד').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('checkbox', { name: 'הכרחי' }).length).toBeGreaterThan(0)
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'הכרחי' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'שמירת משימה' }))

    await waitFor(() => expect(updateRequirementsMutation).toHaveBeenCalledWith({
      manpower: { required: true, quantity: 2 },
      roles: [{ roleId: 'role-1', required: false, quantity: 1 }],
      qualifications: [{ qualificationId: 'qual-1', required: false, quantity: 1 }],
    }))
  })

  it('requires a valid manpower quantity before saving a task definition', async () => {
    const createTaskMutation = vi.fn().mockResolvedValue({ id: 'task-1' })
    const updateRequirementsMutation = vi.fn()
    useCreateActivityTaskMock.mockReturnValue({
      mutateAsync: createTaskMutation,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateActivityTask>)
    useUpdateActivityTaskRequirementsMock.mockReturnValue({
      mutateAsync: updateRequirementsMutation,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateActivityTaskRequirements>)

    render(<ActivityTaskCreatePage />)

    fireEvent.change(screen.getByLabelText('שם המשימה'), { target: { value: 'הכנה' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /הכרחי/i }))
    const quantityInput = screen.getByLabelText('כמות')
    fireEvent.change(quantityInput, { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'יצירת משימה' }))

    await waitFor(() => expect(screen.getByText('כמות כוח אדם חייבת להיות גדולה מ-0.')).toBeDefined())
    expect(createTaskMutation).not.toHaveBeenCalled()
    expect(updateRequirementsMutation).not.toHaveBeenCalled()
  })
})
