import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/roles/queries/use-roles', () => ({
  useCompanyRoles: vi.fn(),
  useDeleteRole: vi.fn(),
}))
vi.mock('@/app/auth/use-auth-session', () => ({
  useAuthSession: vi.fn(),
}))

import { useAuthSession } from '@/app/auth/use-auth-session'
import { useCompanyRoles, useDeleteRole } from '@/features/roles/queries/use-roles'
import { RolesPage } from '@/features/roles/pages/roles-page'

const useAuthSessionMock = vi.mocked(useAuthSession)
const useCompanyRolesMock = vi.mocked(useCompanyRoles)
const useDeleteRoleMock = vi.mocked(useDeleteRole)

const makeRole = (index: number) => ({
  id: `role-${index}`,
  name: `תפקיד ${index}`,
  description: `תיאור ${index}`,
  createdAt: '2026-01-01T00:00:00.000Z',
})

const makePageData = (roles: ReturnType<typeof makeRole>[], page = 1, pageSize = 10) => ({
  items: roles.slice((page - 1) * pageSize, page * pageSize),
  total: roles.length,
  page,
  pageSize,
})

const makeRoles = (count: number) => Array.from({ length: count }, (_, index) => makeRole(index + 1))

describe('RolesPage', () => {
  beforeEach(() => {
    useAuthSessionMock.mockReset()
    useCompanyRolesMock.mockReset()
    useDeleteRoleMock.mockReset()
    useAuthSessionMock.mockReturnValue({
      user: { companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)
  })

  it('renders the loading state while roles are loading', () => {
    useCompanyRolesMock.mockReturnValue({
      isPending: true,
      isError: false,
      data: undefined,
    } as ReturnType<typeof useCompanyRoles>)

    render(
      <MemoryRouter>
        <RolesPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('טוען תפקידים')).toBeDefined()
  })

  it('renders the roles table, create button and pagination controls', () => {
    const roles = makeRoles(22)

    useCompanyRolesMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: makePageData(roles),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyRoles>)

    render(
      <MemoryRouter>
        <RolesPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('תפקידים')).toBeDefined()
    expect(screen.getByRole('button', { name: 'יצירת תפקיד' })).toBeDefined()
    expect(screen.getByText('תפקיד 1')).toBeDefined()
    expect(screen.getByText('תיאור 1')).toBeDefined()
    expect(screen.getByRole('button', { name: 'הבא' })).toBeDefined()
    expect(screen.getAllByRole('button', { name: 'עריכה' }).length).toBeGreaterThan(0)
  })

  it('renders the delete action and confirmation flow', () => {
    const roles = makeRoles(2)
    const deleteRole = vi.fn()

    useCompanyRolesMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: makePageData(roles),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyRoles>)
    useDeleteRoleMock.mockReturnValue({
      isPending: false,
      mutateAsync: deleteRole,
    } as unknown as ReturnType<typeof useDeleteRole>)

    render(
      <MemoryRouter>
        <RolesPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'מחק' })[0])

    expect(screen.getByText(/האם למחוק את התפקיד/i)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'ביטול' }))
    expect(deleteRole).not.toHaveBeenCalled()
  })

  it('calls delete API on confirmation and handles successful refresh', async () => {
    const deleteRole = vi.fn().mockResolvedValue({ id: 'role-1' })

    useCompanyRolesMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: makePageData(makeRoles(2)),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyRoles>)
    useDeleteRoleMock.mockReturnValue({
      isPending: false,
      mutateAsync: deleteRole,
    } as unknown as ReturnType<typeof useDeleteRole>)

    render(
      <MemoryRouter>
        <RolesPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'מחק' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'אישור מחיקה' }))

    await waitFor(() => expect(deleteRole).toHaveBeenCalledWith('role-1'))
  })

  it('displays a delete error when the request fails', async () => {
    const deleteRole = vi.fn().mockRejectedValue(new Error('Delete failed'))

    useCompanyRolesMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: makePageData(makeRoles(2)),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyRoles>)
    useDeleteRoleMock.mockReturnValue({
      isPending: false,
      mutateAsync: deleteRole,
    } as unknown as ReturnType<typeof useDeleteRole>)

    render(
      <MemoryRouter>
        <RolesPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'מחק' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'אישור מחיקה' }))

    await waitFor(() => expect(screen.getByText('Delete failed')).toBeDefined())
  })

  it('renders the error and empty states without breaking the page', () => {
    useCompanyRolesMock.mockReturnValue({
      isPending: false,
      isError: true,
      error: new Error('Boom'),
      refetch: vi.fn(),
      data: undefined,
    } as unknown as ReturnType<typeof useCompanyRoles>)

    const { rerender } = render(
      <MemoryRouter>
        <RolesPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('טעינת תפקידים נכשלה')).toBeDefined()

    useCompanyRolesMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: { items: [], total: 0, page: 1, pageSize: 10 },
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyRoles>)

    rerender(
      <MemoryRouter>
        <RolesPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('אין תפקידים להצגה')).toBeDefined()
  })

  it('moves to the next page and shows the next slice of roles', () => {
    const roles = makeRoles(22)

    useCompanyRolesMock.mockImplementation((_companyId, params) => ({
      isPending: false,
      isError: false,
      data: makePageData(roles, params?.page ?? 1, params?.pageSize ?? 10),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyRoles>))

    render(
      <MemoryRouter>
        <RolesPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'הבא' }))

    expect(useCompanyRolesMock).toHaveBeenLastCalledWith(
      'company-1',
      expect.objectContaining({ page: 2, pageSize: 10, sortBy: 'name', sortOrder: 'asc' }),
    )
    expect(screen.getByText('תפקיד 11')).toBeDefined()
    expect(screen.queryByText('תפקיד 1')).toBeNull()
  })

  it('shows the correct range text and handles zero records without invalid ranges', () => {
    useCompanyRolesMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: makePageData(makeRoles(22), 2, 10),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyRoles>)

    const { rerender } = render(
      <MemoryRouter>
        <RolesPage />
      </MemoryRouter>,
    )

    expect(document.body.textContent).toMatch(/מציג.*1.*10.*22.*רשומות/i)

    useCompanyRolesMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: { items: [], total: 0, page: 1, pageSize: 10 },
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyRoles>)

    rerender(
      <MemoryRouter>
        <RolesPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('אין רשומות להצגה')).toBeDefined()
  })

  it('changes the page size, resets to page one, and requests the selected size', () => {
    const roles = makeRoles(50)
    useCompanyRolesMock.mockImplementation((_companyId, params) => ({
      isPending: false,
      isError: false,
      data: makePageData(roles, params?.page ?? 1, params?.pageSize ?? 10),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyRoles>))

    render(
      <MemoryRouter>
        <RolesPage />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('מספר רשומות לעמוד'), { target: { value: '25' } })

    expect(useCompanyRolesMock).toHaveBeenLastCalledWith(
      'company-1',
      expect.objectContaining({ page: 1, pageSize: 25, sortBy: 'name', sortOrder: 'asc' }),
    )
  })

  it('sorts by a column, toggles order, and resets pagination to page one', () => {
    const roles = makeRoles(20)
    useCompanyRolesMock.mockImplementation((_companyId, params) => ({
      isPending: false,
      isError: false,
      data: makePageData(roles, params?.page ?? 1, params?.pageSize ?? 10),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyRoles>))

    render(
      <MemoryRouter>
        <RolesPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'מיון לפי תיאור' }))
    expect(useCompanyRolesMock).toHaveBeenLastCalledWith(
      'company-1',
      expect.objectContaining({ page: 1, pageSize: 10, sortBy: 'description', sortOrder: 'asc' }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'מיון לפי תיאור' }))
    expect(useCompanyRolesMock).toHaveBeenLastCalledWith(
      'company-1',
      expect.objectContaining({ page: 1, pageSize: 10, sortBy: 'description', sortOrder: 'desc' }),
    )
  })
})
