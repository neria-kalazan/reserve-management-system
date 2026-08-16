import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/qualifications/queries/use-qualifications', () => ({
  useCompanyQualifications: vi.fn(),
}))
vi.mock('@/app/auth/use-auth-session', () => ({
  useAuthSession: vi.fn(),
}))

import { useAuthSession } from '@/app/auth/use-auth-session'
import { useCompanyQualifications } from '@/features/qualifications/queries/use-qualifications'
import { QualificationsPage } from '@/features/qualifications/pages/qualifications-page'

const useAuthSessionMock = vi.mocked(useAuthSession)
const useCompanyQualificationsMock = vi.mocked(useCompanyQualifications)

const makeQualification = (index: number) => ({
  id: `qualification-${index}`,
  name: `הסמכה ${index}`,
  description: `תיאור ${index}`,
  createdAt: '2026-01-01T00:00:00.000Z',
})

const makeQualifications = (count: number) => Array.from({ length: count }, (_, index) => makeQualification(index + 1))

describe('QualificationsPage', () => {
  beforeEach(() => {
    useAuthSessionMock.mockReset()
    useCompanyQualificationsMock.mockReset()
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
      data: qualifications,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyQualifications>)

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
      data: [],
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

    useCompanyQualificationsMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: qualifications,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyQualifications>)

    render(
      <MemoryRouter>
        <QualificationsPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'הבא' }))

    expect(screen.getByText('הסמכה 11')).toBeDefined()
    expect(screen.queryByText('הסמכה 1')).toBeNull()
  })
})
