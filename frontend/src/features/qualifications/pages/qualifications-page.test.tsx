import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/qualifications/queries/use-qualifications', () => ({
  useCompanyQualifications: vi.fn(),
  useDeleteQualification: vi.fn(),
}))
vi.mock('@/app/auth/use-auth-session', () => ({
  useAuthSession: vi.fn(),
}))

import { useAuthSession } from '@/app/auth/use-auth-session'
import { useCompanyQualifications, useDeleteQualification } from '@/features/qualifications/queries/use-qualifications'
import { QualificationsPage } from '@/features/qualifications/pages/qualifications-page'

const useAuthSessionMock = vi.mocked(useAuthSession)
const useCompanyQualificationsMock = vi.mocked(useCompanyQualifications)
const useDeleteQualificationMock = vi.mocked(useDeleteQualification)

const makeQualification = (index: number) => ({
  id: `qualification-${index}`,
  name: `הסמכה ${index}`,
  description: `תיאור ${index}`,
  createdAt: '2026-01-01T00:00:00.000Z',
})

const makePageData = (qualifications: ReturnType<typeof makeQualification>[], page = 1, pageSize = 10) => ({
  items: qualifications.slice((page - 1) * pageSize, page * pageSize),
  total: qualifications.length,
  page,
  pageSize,
})

const makeQualifications = (count: number) => Array.from({ length: count }, (_, index) => makeQualification(index + 1))

describe('QualificationsPage', () => {
  beforeEach(() => {
    useAuthSessionMock.mockReset()
    useCompanyQualificationsMock.mockReset()
    useDeleteQualificationMock.mockReset()
    useAuthSessionMock.mockReturnValue({
      user: { companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)
  })

  it('renders the loading state while qualifications are loading', () => {
    useCompanyQualificationsMock.mockReturnValue({
      isPending: true,
      isError: false,
      data: undefined,
    } as ReturnType<typeof useCompanyQualifications>)

    render(
      <MemoryRouter>
        <QualificationsPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('טוען הסמכות')).toBeDefined()
  })

  it('renders the table, create button and pagination controls', () => {
    const qualifications = makeQualifications(22)

    useCompanyQualificationsMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: makePageData(qualifications),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyQualifications>)
    useDeleteQualificationMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    } as unknown as ReturnType<typeof useDeleteQualification>)

    render(
      <MemoryRouter>
        <QualificationsPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('הסמכות')).toBeDefined()
    expect(screen.getByRole('button', { name: 'יצירת הסמכה' })).toBeDefined()
    expect(screen.getByText('הסמכה 1')).toBeDefined()
    expect(screen.getByText('תיאור 1')).toBeDefined()
    expect(screen.getByRole('button', { name: 'הבא' })).toBeDefined()
    expect(screen.getAllByRole('button', { name: 'עריכה' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'מחק' }).length).toBeGreaterThan(0)
  })

  it('opens confirmation and does not delete on cancel', () => {
    const deleteQualification = vi.fn()

    useCompanyQualificationsMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: makePageData(makeQualifications(2)),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyQualifications>)
    useDeleteQualificationMock.mockReturnValue({
      isPending: false,
      mutateAsync: deleteQualification,
    } as unknown as ReturnType<typeof useDeleteQualification>)

    render(
      <MemoryRouter>
        <QualificationsPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'מחק' })[0])

    expect(screen.getByText(/האם למחוק את ההסמכה/i)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'ביטול' }))
    expect(deleteQualification).not.toHaveBeenCalled()
  })

  it('calls delete mutation when confirmed and refreshes the list', async () => {
    const deleteQualification = vi.fn().mockResolvedValue({ id: 'qualification-1' })

    useCompanyQualificationsMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: makePageData(makeQualifications(2)),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyQualifications>)
    useDeleteQualificationMock.mockReturnValue({
      isPending: false,
      mutateAsync: deleteQualification,
    } as unknown as ReturnType<typeof useDeleteQualification>)

    render(
      <MemoryRouter>
        <QualificationsPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'מחק' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'אישור מחיקה' }))

    await waitFor(() => expect(deleteQualification).toHaveBeenCalledWith('qualification-1'))
  })

  it('shows delete error when the request fails', async () => {
    const deleteQualification = vi.fn().mockRejectedValue(new Error('Delete failed'))

    useCompanyQualificationsMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: makePageData(makeQualifications(2)),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyQualifications>)
    useDeleteQualificationMock.mockReturnValue({
      isPending: false,
      mutateAsync: deleteQualification,
    } as unknown as ReturnType<typeof useDeleteQualification>)

    render(
      <MemoryRouter>
        <QualificationsPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'מחק' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'אישור מחיקה' }))

    await waitFor(() => expect(screen.getByText('Delete failed')).toBeDefined())
  })

  it('renders the error and empty states without breaking the page', () => {
    useCompanyQualificationsMock.mockReturnValue({
      isPending: false,
      isError: true,
      error: new Error('Boom'),
      refetch: vi.fn(),
      data: undefined,
    } as unknown as ReturnType<typeof useCompanyQualifications>)

    const { rerender } = render(
      <MemoryRouter>
        <QualificationsPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('טעינת הסמכות נכשלה')).toBeDefined()

    useCompanyQualificationsMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: { items: [], total: 0, page: 1, pageSize: 10 },
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyQualifications>)

    rerender(
      <MemoryRouter>
        <QualificationsPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('אין הסמכות להצגה')).toBeDefined()
  })

  it('moves to the next page and shows the next slice of qualifications', () => {
    const qualifications = makeQualifications(22)

    useCompanyQualificationsMock.mockImplementation((_companyId, params) => ({
      isPending: false,
      isError: false,
      data: makePageData(qualifications, params?.page ?? 1, params?.pageSize ?? 10),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyQualifications>))

    render(
      <MemoryRouter>
        <QualificationsPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'הבא' }))

    expect(useCompanyQualificationsMock).toHaveBeenLastCalledWith(
      'company-1',
      expect.objectContaining({ page: 2, pageSize: 10, sortBy: 'name', sortOrder: 'asc' }),
    )
    expect(screen.getByText('הסמכה 11')).toBeDefined()
    expect(screen.queryByText('הסמכה 1')).toBeNull()
  })

  it('shows pagination range text and handles empty states correctly', () => {
    useCompanyQualificationsMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: makePageData(makeQualifications(22), 2, 10),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyQualifications>)

    const { rerender } = render(
      <MemoryRouter>
        <QualificationsPage />
      </MemoryRouter>,
    )

    expect(document.body.textContent).toMatch(/מציג.*1.*10.*22.*רשומות/i)

    useCompanyQualificationsMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: { items: [], total: 0, page: 1, pageSize: 10 },
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyQualifications>)

    rerender(
      <MemoryRouter>
        <QualificationsPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('אין רשומות להצגה')).toBeDefined()
  })

  it('changes page size and resets paging when sorting changes', () => {
    const qualifications = makeQualifications(50)
    useCompanyQualificationsMock.mockImplementation((_companyId, params) => ({
      isPending: false,
      isError: false,
      data: makePageData(qualifications, params?.page ?? 1, params?.pageSize ?? 10),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyQualifications>))

    render(
      <MemoryRouter>
        <QualificationsPage />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('מספר רשומות לעמוד'), { target: { value: '25' } })
    expect(useCompanyQualificationsMock).toHaveBeenLastCalledWith(
      'company-1',
      expect.objectContaining({ page: 1, pageSize: 25, sortBy: 'name', sortOrder: 'asc' }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'מיון לפי תיאור' }))
    expect(useCompanyQualificationsMock).toHaveBeenLastCalledWith(
      'company-1',
      expect.objectContaining({ page: 1, pageSize: 25, sortBy: 'description', sortOrder: 'asc' }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'מיון לפי תיאור' }))
    expect(useCompanyQualificationsMock).toHaveBeenLastCalledWith(
      'company-1',
      expect.objectContaining({ page: 1, pageSize: 25, sortBy: 'description', sortOrder: 'desc' }),
    )
  })
})
