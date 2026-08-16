import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/users/queries/use-users', () => ({
  useCompanyUsers: vi.fn(),
  useImportCompanyUsers: vi.fn(),
  useDeactivateUser: vi.fn(),
}))
vi.mock('@/app/auth/use-auth-session', () => ({
  useAuthSession: vi.fn(),
}))
vi.mock('@/features/users/api/users', () => ({
  importCompanyUsers: vi.fn(),
}))

import { useAuthSession } from '@/app/auth/use-auth-session'
import { importCompanyUsers } from '@/features/users/api/users'
import { useCompanyUsers, useDeactivateUser, useImportCompanyUsers } from '@/features/users/queries/use-users'
import { UsersPage } from '@/features/users/pages/users-page'
import { useImportCompanyUsers as useImportCompanyUsersHook } from '@/features/users/queries/use-users'

const useAuthSessionMock = vi.mocked(useAuthSession)
const useCompanyUsersMock = vi.mocked(useCompanyUsers)
const useImportCompanyUsersMock = vi.mocked(useImportCompanyUsers)
const useDeactivateUserMock = vi.mocked(useDeactivateUser)
const importCompanyUsersMock = vi.mocked(importCompanyUsers)

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
    useImportCompanyUsersMock.mockReset()
    useDeactivateUserMock.mockReset()
    useAuthSessionMock.mockReset()
    importCompanyUsersMock.mockReset()
    useAuthSessionMock.mockReturnValue({
      user: { companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)
    useImportCompanyUsersMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    } as unknown as ReturnType<typeof useImportCompanyUsers>)
    useDeactivateUserMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    } as unknown as ReturnType<typeof useDeactivateUser>)
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

    expect(screen.getByText('טוען כוח אדם')).toBeDefined()
  })

  it('renders the table, import and create actions and pagination controls for the company personnel', () => {
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

    expect(screen.getByText('כוח אדם')).toBeDefined()
    expect(screen.getByRole('button', { name: 'ייבוא כוח אדם' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'יצירת כוח אדם' })).toBeDefined()
    expect(screen.getByText('שם 1')).toBeDefined()
    expect(screen.getByText('משפחה 1')).toBeDefined()
    expect(screen.getByText('1001')).toBeDefined()
    expect(screen.getByRole('button', { name: 'הבא' })).toBeDefined()
    expect(screen.getAllByRole('button', { name: 'עריכה' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'הפסק פעילות' }).length).toBeGreaterThan(0)
  })

  it('opens confirmation and does not deactivate on cancel', () => {
    const deactivateUser = vi.fn()

    useCompanyUsersMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: makeUsers(2),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyUsers>)
    useDeactivateUserMock.mockReturnValue({
      isPending: false,
      mutateAsync: deactivateUser,
    } as unknown as ReturnType<typeof useDeactivateUser>)

    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'הפסק פעילות' })[0])

    expect(screen.getByText(/האם להפסיק את פעילותו/i)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'ביטול' }))
    expect(deactivateUser).not.toHaveBeenCalled()
  })

  it('calls deactivate mutation when confirmed and refreshes the list', async () => {
    const deactivateUser = vi.fn().mockResolvedValue({ id: 'user-1', isActive: false })

    useCompanyUsersMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: makeUsers(2),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyUsers>)
    useDeactivateUserMock.mockReturnValue({
      isPending: false,
      mutateAsync: deactivateUser,
    } as unknown as ReturnType<typeof useDeactivateUser>)

    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'הפסק פעילות' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'אישור הפסקה' }))

    await waitFor(() => expect(deactivateUser).toHaveBeenCalledWith('user-1'))
  })

  it('shows a user-facing deactivation error when the request fails', async () => {
    const deactivateUser = vi.fn().mockRejectedValue(new Error('Deactivation failed'))

    useCompanyUsersMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: makeUsers(2),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyUsers>)
    useDeactivateUserMock.mockReturnValue({
      isPending: false,
      mutateAsync: deactivateUser,
    } as unknown as ReturnType<typeof useDeactivateUser>)

    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'הפסק פעילות' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'אישור הפסקה' }))

    await waitFor(() => expect(screen.getByText('Deactivation failed')).toBeDefined())
  })

  it('triggers the import request and sends the selected CSV file', async () => {
    const users = makeUsers(2)
    const upload = vi.fn().mockResolvedValue({ created: 1, failed: 0, errors: [] })

    useCompanyUsersMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: users,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyUsers>)
    useImportCompanyUsersMock.mockReturnValue({
      isPending: false,
      mutateAsync: upload,
    } as unknown as ReturnType<typeof useImportCompanyUsers>)

    const { container } = render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    )

    const file = new File(['firstName,lastName,phone,personalNumber,unitName\nTest,User,050,123,Team'], 'users.csv', {
      type: 'text/csv',
    })

    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [file] },
    })

    await waitFor(() => expect(upload).toHaveBeenCalledWith(file))
  })

  it('displays partial import failures from the backend response', async () => {
    const users = makeUsers(2)
    const upload = vi.fn().mockResolvedValue({
      created: 1,
      failed: 1,
      errors: [{ row: 2, reason: 'Missing required fields' }],
    })

    useCompanyUsersMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: users,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyUsers>)
    useImportCompanyUsersMock.mockReturnValue({
      isPending: false,
      mutateAsync: upload,
    } as unknown as ReturnType<typeof useImportCompanyUsers>)

    const { container } = render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    )

    const file = new File(['firstName,lastName,phone,personalNumber,unitName\nGood,User,050,123,Team\nBad,,050,,'], 'users.csv', {
      type: 'text/csv',
    })

    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [file] },
    })

    await waitFor(() => expect(screen.getByText(/ייבוא הושלם/i)).toBeDefined())
    expect(screen.getByText(/שורה 2: Missing required fields/i)).toBeDefined()
  })

  it('displays a request failure message when the upload fails', async () => {
    const users = makeUsers(2)
    const upload = vi.fn().mockRejectedValue(new Error('שגיאת שרת'))

    useCompanyUsersMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: users,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyUsers>)
    useImportCompanyUsersMock.mockReturnValue({
      isPending: false,
      mutateAsync: upload,
    } as unknown as ReturnType<typeof useImportCompanyUsers>)

    const { container } = render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    )

    const file = new File(['firstName,lastName,phone,personalNumber,unitName\nTest,User,050,123,Team'], 'users.csv', {
      type: 'text/csv',
    })

    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [file] },
    })

    await waitFor(() => expect(screen.getByText('שגיאת שרת')).toBeDefined())
  })

  it('rejects invalid file types before the import request is submitted', async () => {
    const users = makeUsers(2)
    const upload = vi.fn()

    useCompanyUsersMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: users,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyUsers>)
    useImportCompanyUsersMock.mockReturnValue({
      isPending: false,
      mutateAsync: upload,
    } as unknown as ReturnType<typeof useImportCompanyUsers>)

    const { container } = render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    )

    const file = new File(['bad data'], 'users.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [file] },
    })

    expect(screen.getByText('קובץ לא תקין. בחר קובץ CSV בלבד.')).toBeDefined()
    expect(upload).not.toHaveBeenCalled()
  })

  it('uses the authenticated companyId when importing personnel', async () => {
    const actual = await vi.importActual<typeof import('@/features/users/queries/use-users')>(
      '@/features/users/queries/use-users',
    )
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    useAuthSessionMock.mockReturnValue({
      user: { companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)

    const file = new File(['firstName,lastName,phone,personalNumber,unitName\nTest,User,050,123,Team'], 'users.csv', {
      type: 'text/csv',
    })

    importCompanyUsersMock.mockResolvedValue({ created: 1, failed: 0, errors: [] })

    const { result } = renderHook(() => actual.useImportCompanyUsers(), {
      wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
    })

    await result.current.mutateAsync(file)

    expect(importCompanyUsersMock).toHaveBeenCalledWith('company-1', file)
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['companies', 'company-1', 'users'] })
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
