import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/app/auth/use-auth-session', () => ({
  useAuthSession: vi.fn(),
}))

vi.mock('@/features/users/api/users', async () => {
  const actual = await vi.importActual<typeof import('@/features/users/api/users')>('@/features/users/api/users')
  return {
    ...actual,
    assignUserRole: vi.fn(),
    assignUserQualification: vi.fn(),
    removeUserRole: vi.fn(),
    removeUserQualification: vi.fn(),
  }
})

vi.mock('@/features/units/queries/use-units', () => ({
  useCompanyUnits: vi.fn(),
}))

vi.mock('@/features/roles/queries/use-roles', () => ({
  useCompanyRoles: vi.fn(),
}))

vi.mock('@/features/qualifications/queries/use-qualifications', () => ({
  useCompanyQualifications: vi.fn(),
}))

vi.mock('@/features/users/queries/use-users', () => ({
  useUserById: vi.fn(),
  useUserRoles: vi.fn(),
  useUserQualifications: vi.fn(),
  useCreateUser: vi.fn(),
  useUpdateUser: vi.fn(),
}))

import { useAuthSession } from '@/app/auth/use-auth-session'
import * as userApi from '@/features/users/api/users'
import { useCompanyQualifications } from '@/features/qualifications/queries/use-qualifications'
import { useCompanyRoles } from '@/features/roles/queries/use-roles'
import { useCompanyUnits } from '@/features/units/queries/use-units'
import { useCreateUser, useUpdateUser, useUserById, useUserQualifications, useUserRoles } from '@/features/users/queries/use-users'
import { UserFormPage } from '@/features/users/pages/user-form-page'

const useAuthSessionMock = vi.mocked(useAuthSession)
const useCompanyUnitsMock = vi.mocked(useCompanyUnits)
const useCompanyRolesMock = vi.mocked(useCompanyRoles)
const useCompanyQualificationsMock = vi.mocked(useCompanyQualifications)
const useUserByIdMock = vi.mocked(useUserById)
const useUserRolesMock = vi.mocked(useUserRoles)
const useUserQualificationsMock = vi.mocked(useUserQualifications)
const useCreateUserMock = vi.mocked(useCreateUser)
const useUpdateUserMock = vi.mocked(useUpdateUser)

const renderForm = (initialEntry = '/users/new') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/users/new" element={<UserFormPage />} />
          <Route path="/users/:userId/edit" element={<UserFormPage />} />
          <Route path="/users" element={<div>Users List</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('UserFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useAuthSessionMock.mockReturnValue({
      user: { companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)

    useCompanyUnitsMock.mockReturnValue({
      data: [
        { id: 'unit-1', name: 'יחידה 1', description: 'א', displayOrder: 1 },
        { id: 'unit-2', name: 'יחידה 2', description: 'ב', displayOrder: 2 },
      ],
      isPending: false,
      isError: false,
    } as any)

    useCompanyRolesMock.mockReturnValue({
      data: [
        { id: 'role-1', name: 'תפקיד 1', description: 'ר1' },
        { id: 'role-2', name: 'תפקיד 2', description: 'ר2' },
      ],
      isPending: false,
      isError: false,
    } as any)

    useCompanyQualificationsMock.mockReturnValue({
      data: [
        { id: 'qual-1', name: 'סמכה 1', description: 'ס1' },
        { id: 'qual-2', name: 'סמכה 2', description: 'ס2' },
      ],
      isPending: false,
      isError: false,
    } as any)

    useUserByIdMock.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: false,
    } as any)

    useUserRolesMock.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
    } as any)

    useUserQualificationsMock.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
    } as any)

    useCreateUserMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any)

    useUpdateUserMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any)

    vi.mocked(userApi.assignUserRole).mockResolvedValue(undefined)
    vi.mocked(userApi.assignUserQualification).mockResolvedValue(undefined)
    vi.mocked(userApi.removeUserRole).mockResolvedValue(undefined)
    vi.mocked(userApi.removeUserQualification).mockResolvedValue(undefined)
  })

  it('renders create mode with the required fields and loads company options', () => {
    renderForm('/users/new')

    expect(screen.getAllByText('יצירת חייל').length).toBeGreaterThan(0)
    expect(screen.getByLabelText('שם פרטי')).toBeDefined()
    expect(screen.getByLabelText('שם משפחה')).toBeDefined()
    expect(screen.getByLabelText('מספר אישי')).toBeDefined()
    expect(screen.getByLabelText('טלפון')).toBeDefined()
    expect(screen.getByLabelText('יחידה')).toBeDefined()
    expect(screen.getByText('תפקיד 1')).toBeDefined()
    expect(screen.getByText('סמכה 1')).toBeDefined()
  })

  it('loads and populates the existing user in edit mode', () => {
    useUserByIdMock.mockReturnValue({
      data: {
        id: 'user-123',
        firstName: 'אבי',
        lastName: 'כהן',
        phone: '0501234567',
        email: 'avi@example.com',
        personalNumber: '12345',
        isActive: true,
        unit: { id: 'unit-2', name: 'יחידה 2', description: 'ב', displayOrder: 2 },
      },
      isPending: false,
      isError: false,
    } as any)

    useUserRolesMock.mockReturnValue({
      data: ['role-1'],
      isPending: false,
      isError: false,
    } as any)

    useUserQualificationsMock.mockReturnValue({
      data: ['qual-1'],
      isPending: false,
      isError: false,
    } as any)

    renderForm('/users/user-123/edit')

    expect(screen.getAllByText('עריכת חייל').length).toBeGreaterThan(0)
    expect(screen.getByDisplayValue('אבי')).toBeDefined()
    expect(screen.getByDisplayValue('כהן')).toBeDefined()
    expect(screen.getByDisplayValue('0501234567')).toBeDefined()
    expect(screen.getByDisplayValue('avi@example.com')).toBeDefined()
    expect(screen.getByDisplayValue('12345')).toBeDefined()
  })

  it('validates required fields before submit', async () => {
    const createMutation = { mutateAsync: vi.fn(), isPending: false }
    useCreateUserMock.mockReturnValue(createMutation as any)

    renderForm('/users/new')

    fireEvent.click(screen.getByRole('button', { name: 'שמירת חייל' }))

    expect(await screen.findByText('יש להזין שם פרטי.')).toBeDefined()
    expect(await screen.findByText('יש להזין שם משפחה.')).toBeDefined()
    expect(await screen.findByText('יש להזין מספר אישי.')).toBeDefined()
    expect(createMutation.mutateAsync).not.toHaveBeenCalled()
  })

  it('submits create data with the user create API and selected relations', async () => {
    const createMutation = { mutateAsync: vi.fn().mockResolvedValue({ id: 'new-user' }), isPending: false }
    useCreateUserMock.mockReturnValue(createMutation as any)

    renderForm('/users/new')

    fireEvent.change(screen.getByLabelText('שם פרטי'), { target: { value: 'דניאל' } })
    fireEvent.change(screen.getByLabelText('שם משפחה'), { target: { value: 'לוי' } })
    fireEvent.change(screen.getByLabelText('מספר אישי'), { target: { value: '98765' } })
    fireEvent.change(screen.getByLabelText('טלפון'), { target: { value: '0507654321' } })
    fireEvent.change(screen.getByLabelText('דוא"ל'), { target: { value: 'daniel@example.com' } })
    fireEvent.change(screen.getByLabelText('יחידה'), { target: { value: 'unit-2' } })
    fireEvent.click(screen.getByLabelText('תפקיד 1'))
    fireEvent.click(screen.getByLabelText('סמכה 1'))
    fireEvent.click(screen.getByRole('button', { name: 'שמירת חייל' }))

    await waitFor(() => {
      expect(createMutation.mutateAsync).toHaveBeenCalledWith({
        firstName: 'דניאל',
        lastName: 'לוי',
        phone: '0507654321',
        email: 'daniel@example.com',
        personalNumber: '98765',
        unitId: 'unit-2',
      })
    })

    await waitFor(() => {
      expect(userApi.assignUserRole).toHaveBeenCalledWith('new-user', 'role-1')
      expect(userApi.assignUserQualification).toHaveBeenCalledWith('new-user', 'qual-1')
    })
  })

  it('submits edit data and synchronizes role and qualification assignments', async () => {
    useUserByIdMock.mockReturnValue({
      data: {
        id: 'user-123',
        firstName: 'אבי',
        lastName: 'כהן',
        phone: '0501234567',
        email: 'avi@example.com',
        personalNumber: '12345',
        isActive: true,
        unit: { id: 'unit-1', name: 'יחידה 1', description: 'א', displayOrder: 1 },
      },
      isPending: false,
      isError: false,
    } as any)

    useUserRolesMock.mockReturnValue({
      data: ['role-1'],
      isPending: false,
      isError: false,
    } as any)

    useUserQualificationsMock.mockReturnValue({
      data: ['qual-1'],
      isPending: false,
      isError: false,
    } as any)

    const updateMutation = { mutateAsync: vi.fn().mockResolvedValue({ id: 'user-123' }), isPending: false }
    useUpdateUserMock.mockReturnValue(updateMutation as any)

    renderForm('/users/user-123/edit')

    fireEvent.change(screen.getByLabelText('שם פרטי'), { target: { value: 'אבי' } })
    fireEvent.change(screen.getByLabelText('שם משפחה'), { target: { value: 'כהן' } })
    fireEvent.change(screen.getByLabelText('טלפון'), { target: { value: '0509999999' } })
    fireEvent.click(screen.getByLabelText('תפקיד 1'))
    fireEvent.click(screen.getByLabelText('תפקיד 2'))
    fireEvent.click(screen.getByLabelText('סמכה 1'))
    fireEvent.click(screen.getByLabelText('סמכה 2'))
    fireEvent.click(screen.getByRole('button', { name: 'שמירת חייל' }))

    await waitFor(() => {
      expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
        userId: 'user-123',
        body: {
          firstName: 'אבי',
          lastName: 'כהן',
          phone: '0509999999',
          email: 'avi@example.com',
          unitId: 'unit-1',
          isActive: true,
        },
      })
    })

    await waitFor(() => {
      expect(userApi.assignUserRole).toHaveBeenCalledWith('user-123', 'role-2')
      expect(userApi.assignUserQualification).toHaveBeenCalledWith('user-123', 'qual-2')
      expect(userApi.removeUserRole).toHaveBeenCalledWith('user-123', 'role-1')
      expect(userApi.removeUserQualification).toHaveBeenCalledWith('user-123', 'qual-1')
    })
  })
})
