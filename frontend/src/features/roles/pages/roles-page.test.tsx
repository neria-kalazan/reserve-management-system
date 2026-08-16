import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/roles/queries/use-roles', () => ({
  useCompanyRoles: vi.fn(),
}))
vi.mock('@/app/auth/use-auth-session', () => ({
  useAuthSession: vi.fn(),
}))

import { useAuthSession } from '@/app/auth/use-auth-session'
import { useCompanyRoles } from '@/features/roles/queries/use-roles'
import { RolesPage } from '@/features/roles/pages/roles-page'

const useAuthSessionMock = vi.mocked(useAuthSession)
const useCompanyRolesMock = vi.mocked(useCompanyRoles)

const makeRole = (index: number) => ({
  id: `role-${index}`,
  name: `תפקיד ${index}`,
  description: `תיאור ${index}`,
  createdAt: '2026-01-01T00:00:00.000Z',
})

const makeRoles = (count: number) => Array.from({ length: count }, (_, index) => makeRole(index + 1))

describe('RolesPage', () => {
  beforeEach(() => {
    useAuthSessionMock.mockReset()
    useCompanyRolesMock.mockReset()
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
      data: roles,
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
      data: [],
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

    useCompanyRolesMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: roles,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyRoles>)

    render(
      <MemoryRouter>
        <RolesPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'הבא' }))

    expect(screen.getByText('תפקיד 11')).toBeDefined()
    expect(screen.queryByText('תפקיד 1')).toBeNull()
  })
})
