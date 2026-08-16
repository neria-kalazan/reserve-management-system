import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/app/auth/use-auth-session', () => ({
  useAuthSession: vi.fn(),
}))

vi.mock('@/features/roles/queries/use-roles', () => ({
  useRoleById: vi.fn(),
  useCreateRole: vi.fn(),
  useUpdateRole: vi.fn(),
}))

import { useAuthSession } from '@/app/auth/use-auth-session'
import { RoleFormPage } from '@/features/roles/pages/role-form-page'
import { useCreateRole, useRoleById, useUpdateRole } from '@/features/roles/queries/use-roles'

const useAuthSessionMock = vi.mocked(useAuthSession)
const useRoleByIdMock = vi.mocked(useRoleById)
const useCreateRoleMock = vi.mocked(useCreateRole)
const useUpdateRoleMock = vi.mocked(useUpdateRole)

const renderForm = (initialEntry = '/roles/new') => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/roles/new" element={<RoleFormPage />} />
          <Route path="/roles/:roleId/edit" element={<RoleFormPage />} />
          <Route path="/roles" element={<div>Roles List</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('RoleFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useAuthSessionMock.mockReturnValue({
      user: { companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)

    useRoleByIdMock.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: false,
    } as any)

    useCreateRoleMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any)

    useUpdateRoleMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any)
  })

  it('renders create mode', () => {
    renderForm('/roles/new')

    expect(screen.getAllByText('יצירת תפקיד').length).toBeGreaterThan(0)
    expect(screen.getByLabelText('שם התפקיד')).toBeDefined()
    expect(screen.getByLabelText('תיאור')).toBeDefined()
  })

  it('validates required fields before submit', async () => {
    const createMutation = { mutateAsync: vi.fn(), isPending: false }
    useCreateRoleMock.mockReturnValue(createMutation as any)

    renderForm('/roles/new')
    fireEvent.click(screen.getByRole('button', { name: 'שמירת תפקיד' }))

    expect(await screen.findByText('יש להזין שם תפקיד.')).toBeDefined()
    expect(createMutation.mutateAsync).not.toHaveBeenCalled()
  })

  it('loads existing data in edit mode', () => {
    useRoleByIdMock.mockReturnValue({
      data: { id: 'role-1', name: 'מנהל', description: 'תיאור תפקיד' },
      isPending: false,
      isError: false,
    } as any)

    renderForm('/roles/role-1/edit')

    expect(screen.getAllByText('עריכת תפקיד').length).toBeGreaterThan(0)
    expect(screen.getByDisplayValue('מנהל')).toBeDefined()
    expect(screen.getByDisplayValue('תיאור תפקיד')).toBeDefined()
  })

  it('creates a role and navigates back to roles list', async () => {
    const createMutation = { mutateAsync: vi.fn().mockResolvedValue({ id: 'r-1' }), isPending: false }
    useCreateRoleMock.mockReturnValue(createMutation as any)

    renderForm('/roles/new')

    fireEvent.change(screen.getByLabelText('שם התפקיד'), { target: { value: 'מפקד' } })
    fireEvent.change(screen.getByLabelText('תיאור'), { target: { value: 'מנהל צוות' } })
    fireEvent.click(screen.getByRole('button', { name: 'שמירת תפקיד' }))

    await waitFor(() => {
      expect(createMutation.mutateAsync).toHaveBeenCalledWith({
        name: 'מפקד',
        description: 'מנהל צוות',
      })
    })

    await waitFor(() => {
      expect(screen.getByText('Roles List')).toBeDefined()
    })
  })

  it('updates a role and navigates back to roles list', async () => {
    useRoleByIdMock.mockReturnValue({
      data: { id: 'role-1', name: 'מנהל', description: 'ישן' },
      isPending: false,
      isError: false,
    } as any)

    const updateMutation = { mutateAsync: vi.fn().mockResolvedValue({ id: 'role-1' }), isPending: false }
    useUpdateRoleMock.mockReturnValue(updateMutation as any)

    renderForm('/roles/role-1/edit')

    fireEvent.change(screen.getByLabelText('שם התפקיד'), { target: { value: 'מנהל מחלקה' } })
    fireEvent.click(screen.getByRole('button', { name: 'שמירת תפקיד' }))

    await waitFor(() => {
      expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
        roleId: 'role-1',
        body: {
          name: 'מנהל מחלקה',
          description: 'ישן',
        },
      })
    })

    await waitFor(() => {
      expect(screen.getByText('Roles List')).toBeDefined()
    })
  })
})
