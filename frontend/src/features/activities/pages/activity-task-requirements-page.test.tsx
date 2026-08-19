import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/activities/queries/use-activities', () => ({
  useActivityById: vi.fn(),
}))

vi.mock('@/features/activities/queries/use-activity-tasks', () => ({
  useActivityTaskRequirements: vi.fn(),
  useUpdateActivityTaskRequirements: vi.fn(),
  useCompanyRoles: vi.fn(),
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

import { useActivityById } from '@/features/activities/queries/use-activities'
import {
  useActivityTaskRequirements,
  useCompanyQualifications,
  useCompanyRoles,
  useUpdateActivityTaskRequirements,
} from '@/features/activities/queries/use-activity-tasks'
import { ActivityTaskRequirementsPage } from '@/features/activities/pages/activity-task-requirements-page'

const useActivityByIdMock = vi.mocked(useActivityById)
const useActivityTaskRequirementsMock = vi.mocked(useActivityTaskRequirements)
const useUpdateActivityTaskRequirementsMock = vi.mocked(useUpdateActivityTaskRequirements)
const useCompanyRolesMock = vi.mocked(useCompanyRoles)
const useCompanyQualificationsMock = vi.mocked(useCompanyQualifications)

describe('ActivityTaskRequirementsPage', () => {
  beforeEach(() => {
    useParamsMock.mockReturnValue({ activityId: 'activity-1', taskId: 'task-1' })
    navigateMock.mockReset()
    useActivityByIdMock.mockReset()
    useActivityTaskRequirementsMock.mockReset()
    useUpdateActivityTaskRequirementsMock.mockReset()
    useCompanyRolesMock.mockReset()
    useCompanyQualificationsMock.mockReset()

    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: { id: 'activity-1', companyId: 'company-1', name: 'פעילות מבצעית' },
    } as unknown as ReturnType<typeof useActivityById>)

    useCompanyRolesMock.mockReturnValue({
      data: [
        { id: 'role-1', name: 'מפקד', description: null },
        { id: 'role-2', name: 'נהג', description: null },
      ],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyRoles>)

    useCompanyQualificationsMock.mockReturnValue({
      data: [
        { id: 'qual-1', name: 'רישיון נהיגה', description: null },
        { id: 'qual-2', name: 'כושר גופני', description: null },
      ],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyQualifications>)

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

    useUpdateActivityTaskRequirementsMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateActivityTaskRequirements>)
  })

  it('renders loading state while requirements and company metadata are loading', () => {
    useActivityTaskRequirementsMock.mockReturnValue({
      isPending: true,
      isError: false,
      data: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityTaskRequirements>)
    useCompanyRolesMock.mockReturnValue({
      isPending: true,
      isError: false,
      data: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyRoles>)
    useCompanyQualificationsMock.mockReturnValue({
      isPending: true,
      isError: false,
      data: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyQualifications>)

    render(<ActivityTaskRequirementsPage />)

    expect(screen.getByText('טוען דרישות')).toBeDefined()
  })

  it('renders existing manpower, role, and qualification requirements from the backend', () => {
    render(<ActivityTaskRequirementsPage />)

    expect(screen.getByDisplayValue('2')).toBeDefined()
    expect(screen.getAllByDisplayValue('1').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('דרישות משימה')).toBeDefined()
  })

  it('adds and removes role requirements', () => {
    render(<ActivityTaskRequirementsPage />)

    fireEvent.click(screen.getByRole('button', { name: 'הוספת תפקיד' }))
    expect(screen.getAllByText('תפקיד').length).toBeGreaterThanOrEqual(2)

    const removeButtons = screen.getAllByRole('button', { name: 'הסרה' })
    expect(removeButtons[0]).toBeDefined()
    fireEvent.click(removeButtons[0] as HTMLElement)
    expect(screen.getAllByText('תפקיד').length).toBeLessThanOrEqual(1)
  })

  it('adds and removes qualification requirements', () => {
    render(<ActivityTaskRequirementsPage />)

    fireEvent.click(screen.getByRole('button', { name: 'הוספת הכשרה' }))
    expect(screen.getAllByText('הכשרה').length).toBeGreaterThanOrEqual(2)

    const removeButtons = screen.getAllByRole('button', { name: 'הסרה' })
    expect(removeButtons.at(-1)).toBeDefined()
    fireEvent.click(removeButtons.at(-1) as HTMLElement)
    expect(screen.getAllByText('הכשרה').length).toBeLessThanOrEqual(1)
  })

  it('updates manpower quantity before saving', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined)
    useUpdateActivityTaskRequirementsMock.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateActivityTaskRequirements>)

    render(<ActivityTaskRequirementsPage />)

    const manpowerSection = screen.getByText('כוח אדם').closest('.space-y-3.rounded-md') as HTMLElement
    const manpowerInput = within(manpowerSection).getByRole('spinbutton') as HTMLInputElement

    fireEvent.change(manpowerInput, { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'שמירת דרישות' }))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        manpower: { required: true, quantity: 5 },
        roles: [{ roleId: 'role-1', required: true, quantity: 1 }],
        qualifications: [{ qualificationId: 'qual-1', required: false, quantity: 1 }],
      })
    })
  })

  it('sends the exact backend payload and navigates back to the activity after a successful save', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined)
    useUpdateActivityTaskRequirementsMock.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateActivityTaskRequirements>)

    render(<ActivityTaskRequirementsPage />)

    fireEvent.click(screen.getByRole('button', { name: 'שמירת דרישות' }))

    await Promise.resolve()

    expect(mutateAsync).toHaveBeenCalledWith({
      manpower: { required: true, quantity: 2 },
      roles: [{ roleId: 'role-1', required: true, quantity: 1 }],
      qualifications: [{ qualificationId: 'qual-1', required: false, quantity: 1 }],
    })
    expect(navigateMock).toHaveBeenCalledWith('/activities/activity-1')
  })

  it('keeps form values after backend rejection and surfaces the error', async () => {
    const mutateAsync = vi.fn().mockRejectedValue({ status: 500, message: 'server error' })
    useUpdateActivityTaskRequirementsMock.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateActivityTaskRequirements>)

    render(<ActivityTaskRequirementsPage />)

    const manpowerSection = screen.getByText('כוח אדם').closest('.space-y-3.rounded-md') as HTMLElement
    const manpowerInput = within(manpowerSection).getByRole('spinbutton') as HTMLInputElement

    fireEvent.change(manpowerInput, { target: { value: '7' } })
    fireEvent.click(screen.getByRole('button', { name: 'שמירת דרישות' }))

    await waitFor(() => {
      expect(screen.getByText('השמירה נכשלה')).toBeDefined()
    })

    expect((within(manpowerSection).getByRole('spinbutton') as HTMLInputElement).value).toBe('7')
  })

  it('supports cancel and back navigation without saving', () => {
    render(<ActivityTaskRequirementsPage />)

    fireEvent.click(screen.getByRole('button', { name: 'חזרה לפרטי פעילות' }))
    expect(navigateMock).toHaveBeenCalledWith('/activities/activity-1')

    const cancelButtons = screen.getAllByRole('button', { name: 'ביטול' })
    expect(cancelButtons[0]).toBeDefined()
    fireEvent.click(cancelButtons[0] as HTMLElement)
    expect(navigateMock).toHaveBeenCalledWith('/activities/activity-1')
  })
})
