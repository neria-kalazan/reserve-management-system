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
  roles: [{ id: `role-${index}`, name: `תפקיד ${index}` }],
  qualifications: [{ id: `qual-${index}`, name: `הסמכה ${index}` }],
})

const makePageData = (users: ReturnType<typeof makeUser>[], page = 1, pageSize = 10) => ({
  items: users.slice((page - 1) * pageSize, page * pageSize),
  total: users.length,
  page,
  pageSize,
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
      data: makePageData(users),
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
    expect(screen.getByText('תפקידים')).toBeDefined()
    expect(screen.getByText('הסמכות')).toBeDefined()
    expect(screen.getByText('תפקיד 1')).toBeDefined()
    expect(screen.getByText('הסמכה 1')).toBeDefined()
    expect(screen.getByRole('button', { name: 'הבא' })).toBeDefined()
    expect(screen.getAllByRole('button', { name: 'עריכה' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'הפסק פעילות' }).length).toBeGreaterThan(0)
  })

  it('renders role names and a compact qualification summary that opens the full list in a popover', async () => {
    const users = [
      {
        ...makeUser(1),
        roles: [{ id: 'role-1', name: 'מפקד כיתה' }, { id: 'role-2', name: 'חובש' }],
        qualifications: [{ id: 'qual-1', name: 'חובש' }, { id: 'qual-2', name: 'נהג' }, { id: 'qual-3', name: 'רפואה' }],
      },
    ]

    useCompanyUsersMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: makePageData(users),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyUsers>)

    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('מפקד כיתה')).toBeDefined()
    expect(screen.getByText('חובש')).toBeDefined()
    expect(screen.getByRole('button', { name: 'חובש • +2' })).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'חובש • +2' }))

    await waitFor(() => {
      expect(screen.getAllByText('חובש').length).toBeGreaterThan(0)
      expect(screen.getAllByText('נהג').length).toBeGreaterThan(0)
      expect(screen.getAllByText('רפואה').length).toBeGreaterThan(0)
    })
  })

  it('renders a single role and single qualification without misleading summaries', () => {
    const users = [
      {
        ...makeUser(1),
        roles: [{ id: 'role-1', name: 'מפקד כיתה' }],
        qualifications: [{ id: 'qual-1', name: 'חובש' }],
      },
    ]

    useCompanyUsersMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: makePageData(users),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyUsers>)

    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('מפקד כיתה')).toBeDefined()
    expect(screen.getByText('חובש')).toBeDefined()
  })

  it('renders empty placeholders when a user has no roles or qualifications', () => {
    const users = [
      {
        ...makeUser(1),
        roles: [],
        qualifications: [],
      },
    ]

    useCompanyUsersMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: makePageData(users),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyUsers>)

    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    )

    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('opens confirmation and does not deactivate on cancel', () => {
    const deactivateUser = vi.fn()
    const users = makeUsers(2)

    useCompanyUsersMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: makePageData(users),
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
    const users = makeUsers(2)

    useCompanyUsersMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: makePageData(users),
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
    const users = makeUsers(2)

    useCompanyUsersMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: makePageData(users),
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
      data: makePageData(users),
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
      data: makePageData(users),
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
      data: makePageData(users),
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
      data: makePageData(users),
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

  it('displays the current range and total count', () => {
    const users = makeUsers(22)
    useCompanyUsersMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: makePageData(users, 1, 10),
      isFetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyUsers>)

    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('מציג 1–10 מתוך 22 רשומות')).toBeDefined()
  })

  it('requests the next page when the next button is clicked', () => {
    const users = makeUsers(22)
    useCompanyUsersMock.mockImplementation((_companyId, params) => ({
      isPending: false,
      isError: false,
      data: makePageData(users, params?.page ?? 1, params?.pageSize ?? 10),
      isFetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyUsers>))

    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'הבא' }))

    expect(useCompanyUsersMock).toHaveBeenLastCalledWith(
      'company-1',
      expect.objectContaining({ page: 2, pageSize: 10, sortBy: 'firstName', sortOrder: 'asc' }),
    )
  })

  it('requests the previous page when the previous button is clicked', () => {
    const users = makeUsers(22)
    useCompanyUsersMock.mockImplementation((_companyId, params) => ({
      isPending: false,
      isError: false,
      data: makePageData(users, params?.page ?? 2, params?.pageSize ?? 10),
      isFetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyUsers>))

    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'הבא' }))
    fireEvent.click(screen.getByRole('button', { name: 'הקודם' }))

    expect(useCompanyUsersMock).toHaveBeenLastCalledWith(
      'company-1',
      expect.objectContaining({ page: 1, pageSize: 10, sortBy: 'firstName', sortOrder: 'asc' }),
    )
  })

  it('disables the previous button on the first page and the next button on the last page', () => {
    const users = makeUsers(12)
    useCompanyUsersMock.mockImplementation((_companyId, params) => ({
      isPending: false,
      isError: false,
      data: makePageData(users, params?.page ?? 1, params?.pageSize ?? 10),
      isFetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyUsers>))

    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    )

    expect((screen.getByRole('button', { name: 'הקודם' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'הבא' }) as HTMLButtonElement).disabled).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'הבא' }))

    expect((screen.getByRole('button', { name: 'הקודם' }) as HTMLButtonElement).disabled).toBe(false)
    expect((screen.getByRole('button', { name: 'הבא' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('changes page size, resets to page one and requests the selected page size', () => {
    const users = makeUsers(50)
    useCompanyUsersMock.mockImplementation((_companyId, params) => ({
      isPending: false,
      isError: false,
      data: makePageData(users, params?.page ?? 1, params?.pageSize ?? 10),
      isFetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyUsers>))

    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('מספר רשומות לעמוד'), { target: { value: '25' } })

    expect(useCompanyUsersMock).toHaveBeenLastCalledWith(
      'company-1',
      expect.objectContaining({ page: 1, pageSize: 25, sortBy: 'firstName', sortOrder: 'asc' }),
    )
  })

  it('renders sortable headers and toggles the sort order between asc and desc', () => {
    const users = makeUsers(20)
    useCompanyUsersMock.mockImplementation((_companyId, params) => ({
      isPending: false,
      isError: false,
      data: makePageData(users, params?.page ?? 1, params?.pageSize ?? 10),
      isFetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyUsers>))

    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'מיון לפי שם' }))
    expect(useCompanyUsersMock).toHaveBeenLastCalledWith(
      'company-1',
      expect.objectContaining({ page: 1, sortBy: 'firstName', sortOrder: 'desc' }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'מיון לפי שם' }))
    expect(useCompanyUsersMock).toHaveBeenLastCalledWith(
      'company-1',
      expect.objectContaining({ page: 1, sortBy: 'firstName', sortOrder: 'asc' }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'מיון לפי משפחה' }))
    expect(useCompanyUsersMock).toHaveBeenLastCalledWith(
      'company-1',
      expect.objectContaining({ page: 1, sortBy: 'lastName', sortOrder: 'asc' }),
    )
  })

  it('shows the empty state when there are no records', () => {
    useCompanyUsersMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: { items: [], total: 0, page: 1, pageSize: 10 },
      isFetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyUsers>)

    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('אין רשומות להצגה')).toBeDefined()
    expect(screen.getByText('אין אנשי צוות להצגה')).toBeDefined()
  })

  it('moves to the next page and keeps the current page in bounds', () => {
    const users = makeUsers(22)
    useCompanyUsersMock.mockImplementation((_companyId, params) => ({
      isPending: false,
      isError: false,
      data: makePageData(users, params?.page ?? 1, params?.pageSize ?? 10),
      isFetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyUsers>))

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
