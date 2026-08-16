import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/users/queries/use-users', () => ({
  useCompanyUsers: vi.fn(),
}))
vi.mock('@/app/auth/use-auth-session', () => ({
  useAuthSession: vi.fn(),
}))

import { useAuthSession } from '@/app/auth/use-auth-session'
import { useCompanyUsers } from '@/features/users/queries/use-users'
import { UsersPage } from '@/features/users/pages/users-page'

const useAuthSessionMock = vi.mocked(useAuthSession)

const useCompanyUsersMock = vi.mocked(useCompanyUsers)

const makeUser = (index: number) => ({
  id: `user-${index}`,
  firstName: `שם ${index}`,
  lastName: `משפחה ${index}`,
  phone: `050-${10000000 + index}`,
  email: `user${index}@example.com`,
  personalNumber: `100${index}`,
  isActive: true,
  unit: {
    id: `unit-${index}`,
    name: `מחלקה ${index}`,
    description: null,
    displayOrder: index,
  },
})

const makeUsers = (count: number) => Array.from({ length: count }, (_, index) => makeUser(index + 1))

describe('UsersPage', () => {
  beforeEach(() => {
    useCompanyUsersMock.mockReset()
    useAuthSessionMock.mockReset()
    useAuthSessionMock.mockReturnValue({
      user: { companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)
  })

  it('renders the loading state while company users are loading', () => {
    useCompanyUsersMock.mockReturnValue({
      isPending: true,
      isError: false,
      data: undefined,
    } as ReturnType<typeof useCompanyUsers>)

    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('טוען חיילים')).toBeDefined()
  })

  it('renders the table, create action and pagination controls for the company soldiers', () => {
    const users = makeUsers(22)

    useCompanyUsersMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: users,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyUsers>)

    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('חיילים')).toBeDefined()
    expect(screen.getByRole('button', { name: 'יצירת חייל' })).toBeDefined()
    expect(screen.getByText('שם 1')).toBeDefined()
    expect(screen.getByText('משפחה 1')).toBeDefined()
    expect(screen.getByText('1001')).toBeDefined()
    expect(screen.getByRole('button', { name: 'הבא' })).toBeDefined()
    expect(screen.getAllByRole('button', { name: 'עריכה' }).length).toBeGreaterThan(0)
  })

  it('moves to the next page and keeps the current page in bounds', () => {
    const users = makeUsers(22)

    useCompanyUsersMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: users,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyUsers>)

    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'הבא' }))

    expect(screen.getByText('שם 11')).toBeDefined()
    expect(screen.queryByText('שם 1')).toBeNull()
  })
})
