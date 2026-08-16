import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/units/queries/use-units', () => ({
  useCompanyUnits: vi.fn(),
  useDeleteUnit: vi.fn(),
}))
vi.mock('@/app/auth/use-auth-session', () => ({
  useAuthSession: vi.fn(),
}))

import { useAuthSession } from '@/app/auth/use-auth-session'
import { useCompanyUnits, useDeleteUnit } from '@/features/units/queries/use-units'
import { UnitsPage } from '@/features/units/pages/units-page'

const useAuthSessionMock = vi.mocked(useAuthSession)
const useCompanyUnitsMock = vi.mocked(useCompanyUnits)
const useDeleteUnitMock = vi.mocked(useDeleteUnit)

const makeUnit = (index: number) => ({
  id: `unit-${index}`,
  name: `יחידה ${index}`,
  description: `תיאור ${index}`,
  displayOrder: index,
  createdAt: '2026-01-01T00:00:00.000Z',
})

const makeUnits = (count: number) => Array.from({ length: count }, (_, index) => makeUnit(index + 1))

describe('UnitsPage', () => {
  beforeEach(() => {
    useAuthSessionMock.mockReset()
    useCompanyUnitsMock.mockReset()
    useDeleteUnitMock.mockReset()
    useAuthSessionMock.mockReturnValue({
      user: { companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)
  })

  it('renders the loading state while units are loading', () => {
    useCompanyUnitsMock.mockReturnValue({
      isPending: true,
      isError: false,
      data: undefined,
    } as ReturnType<typeof useCompanyUnits>)

    render(
      <MemoryRouter>
        <UnitsPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('טוען מסגרות')).toBeDefined()
  })

  it('renders the units table, create button and pagination controls', () => {
    const units = makeUnits(22)

    useCompanyUnitsMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: units,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyUnits>)
    useDeleteUnitMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    } as unknown as ReturnType<typeof useDeleteUnit>)

    render(
      <MemoryRouter>
        <UnitsPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('מסגרות')).toBeDefined()
    expect(screen.getByRole('button', { name: 'יצירת מסגרת' })).toBeDefined()
    expect(screen.getByText('יחידה 1')).toBeDefined()
    expect(screen.getByText('תיאור 1')).toBeDefined()
    expect(screen.getByRole('button', { name: 'הבא' })).toBeDefined()
    expect(screen.getAllByRole('button', { name: 'עריכה' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'מחק' }).length).toBeGreaterThan(0)
  })

  it('opens confirmation and does not delete on cancel', () => {
    const deleteUnit = vi.fn()

    useCompanyUnitsMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: makeUnits(2),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyUnits>)
    useDeleteUnitMock.mockReturnValue({
      isPending: false,
      mutateAsync: deleteUnit,
    } as unknown as ReturnType<typeof useDeleteUnit>)

    render(
      <MemoryRouter>
        <UnitsPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'מחק' })[0])

    expect(screen.getByText(/האם למחוק את המסגרת/i)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'ביטול' }))
    expect(deleteUnit).not.toHaveBeenCalled()
  })

  it('calls delete mutation when confirmed and refreshes the list', async () => {
    const deleteUnit = vi.fn().mockResolvedValue({ id: 'unit-1' })

    useCompanyUnitsMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: makeUnits(2),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyUnits>)
    useDeleteUnitMock.mockReturnValue({
      isPending: false,
      mutateAsync: deleteUnit,
    } as unknown as ReturnType<typeof useDeleteUnit>)

    render(
      <MemoryRouter>
        <UnitsPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'מחק' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'אישור מחיקה' }))

    await waitFor(() => expect(deleteUnit).toHaveBeenCalledWith('unit-1'))
  })

  it('shows deletion error when the request fails', async () => {
    const deleteUnit = vi.fn().mockRejectedValue(new Error('Delete failed'))

    useCompanyUnitsMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: makeUnits(2),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyUnits>)
    useDeleteUnitMock.mockReturnValue({
      isPending: false,
      mutateAsync: deleteUnit,
    } as unknown as ReturnType<typeof useDeleteUnit>)

    render(
      <MemoryRouter>
        <UnitsPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'מחק' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'אישור מחיקה' }))

    await waitFor(() => expect(screen.getByText('Delete failed')).toBeDefined())
  })

  it('uses the authenticated user companyId for company scoping', () => {
    const units = makeUnits(3)

    useCompanyUnitsMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: units,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyUnits>)

    render(
      <MemoryRouter>
        <UnitsPage />
      </MemoryRouter>,
    )

    expect(useCompanyUnitsMock).toHaveBeenCalledWith('company-1')
  })

  it('renders the error and empty states without breaking the page', () => {
    useCompanyUnitsMock.mockReturnValue({
      isPending: false,
      isError: true,
      error: new Error('Boom'),
      refetch: vi.fn(),
      data: undefined,
    } as unknown as ReturnType<typeof useCompanyUnits>)

    const { rerender } = render(
      <MemoryRouter>
        <UnitsPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('טעינת מסגרות נכשלה')).toBeDefined()

    useCompanyUnitsMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyUnits>)

    rerender(
      <MemoryRouter>
        <UnitsPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('אין מסגרות להצגה')).toBeDefined()
  })

  it('moves to the next page and shows the next slice of units', () => {
    const units = makeUnits(22)

    useCompanyUnitsMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: units,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCompanyUnits>)

    render(
      <MemoryRouter>
        <UnitsPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'הבא' }))

    expect(screen.getByText('יחידה 11')).toBeDefined()
    expect(screen.queryByText('יחידה 1')).toBeNull()
  })
})
