import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/app/auth/use-auth-session', () => ({
  useAuthSession: vi.fn(),
}))

vi.mock('@/features/units/queries/use-units', () => ({
  useUnitById: vi.fn(),
  useCreateUnit: vi.fn(),
  useUpdateUnit: vi.fn(),
}))

import { useAuthSession } from '@/app/auth/use-auth-session'
import { UnitFormPage } from '@/features/units/pages/unit-form-page'
import { useCreateUnit, useUnitById, useUpdateUnit } from '@/features/units/queries/use-units'

const useAuthSessionMock = vi.mocked(useAuthSession)
const useUnitByIdMock = vi.mocked(useUnitById)
const useCreateUnitMock = vi.mocked(useCreateUnit)
const useUpdateUnitMock = vi.mocked(useUpdateUnit)

const renderForm = (initialEntry = '/units/new') => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/units/new" element={<UnitFormPage />} />
          <Route path="/units/:unitId/edit" element={<UnitFormPage />} />
          <Route path="/units" element={<div>Units List</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('UnitFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useAuthSessionMock.mockReturnValue({
      user: { companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)

    useUnitByIdMock.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: false,
    } as any)

    useCreateUnitMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any)

    useUpdateUnitMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any)
  })

  it('renders create mode', () => {
    renderForm('/units/new')

    expect(screen.getAllByText('יצירת מסגרת').length).toBeGreaterThan(0)
    expect(screen.getByLabelText('שם המסגרת')).toBeDefined()
    expect(screen.getByLabelText('תיאור')).toBeDefined()
    expect(screen.getByLabelText('סדר תצוגה')).toBeDefined()
  })

  it('validates required fields before submit', async () => {
    const createMutation = { mutateAsync: vi.fn(), isPending: false }
    useCreateUnitMock.mockReturnValue(createMutation as any)

    renderForm('/units/new')
    fireEvent.click(screen.getByRole('button', { name: 'שמירת מסגרת' }))

    expect(await screen.findByText('יש להזין שם מסגרת.')).toBeDefined()
    expect(createMutation.mutateAsync).not.toHaveBeenCalled()
  })

  it('loads existing data in edit mode', () => {
    useUnitByIdMock.mockReturnValue({
      data: { id: 'unit-1', name: 'פלוגה א', description: 'תיאור', displayOrder: 2 },
      isPending: false,
      isError: false,
    } as any)

    renderForm('/units/unit-1/edit')

    expect(screen.getAllByText('עריכת מסגרת').length).toBeGreaterThan(0)
    expect(screen.getByDisplayValue('פלוגה א')).toBeDefined()
    expect(screen.getByDisplayValue('תיאור')).toBeDefined()
    expect(screen.getByDisplayValue('2')).toBeDefined()
  })

  it('accepts zero and positive display orders and rejects negative values', async () => {
    const createMutation = { mutateAsync: vi.fn().mockResolvedValue({ id: 'u-1' }), isPending: false }
    useCreateUnitMock.mockReturnValue(createMutation as any)

    const { unmount } = renderForm('/units/new')

    fireEvent.change(screen.getByLabelText('שם המסגרת'), { target: { value: 'מסגרת אפס' } })
    fireEvent.change(screen.getByLabelText('סדר תצוגה'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'שמירת מסגרת' }))

    await waitFor(() => {
      expect(createMutation.mutateAsync).toHaveBeenCalledWith({
        name: 'מסגרת אפס',
        description: null,
        displayOrder: 0,
      })
    })

    unmount()

    useCreateUnitMock.mockReturnValue(createMutation as any)
    renderForm('/units/new')

    fireEvent.change(screen.getByLabelText('שם המסגרת'), { target: { value: 'מסגרת שלילית' } })
    fireEvent.change(screen.getByLabelText('סדר תצוגה'), { target: { value: '-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'שמירת מסגרת' }))

    expect(await screen.findByText('סדר תצוגה חייב להיות מספר שלם גדול או שווה ל-0.')).toBeDefined()
    expect(createMutation.mutateAsync).toHaveBeenCalledTimes(1)
  })

  it('creates a unit and navigates back to units list', async () => {
    const createMutation = { mutateAsync: vi.fn().mockResolvedValue({ id: 'u-1' }), isPending: false }
    useCreateUnitMock.mockReturnValue(createMutation as any)

    renderForm('/units/new')

    fireEvent.change(screen.getByLabelText('שם המסגרת'), { target: { value: 'פלוגה ב' } })
    fireEvent.change(screen.getByLabelText('תיאור'), { target: { value: 'יחידת לוגיסטיקה' } })
    fireEvent.change(screen.getByLabelText('סדר תצוגה'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'שמירת מסגרת' }))

    await waitFor(() => {
      expect(createMutation.mutateAsync).toHaveBeenCalledWith({
        name: 'פלוגה ב',
        description: 'יחידת לוגיסטיקה',
        displayOrder: 5,
      })
    })

    await waitFor(() => {
      expect(screen.getByText('Units List')).toBeDefined()
    })
  })

  it('updates a unit and navigates back to units list', async () => {
    useUnitByIdMock.mockReturnValue({
      data: { id: 'unit-1', name: 'פלוגה א', description: 'ישן', displayOrder: 1 },
      isPending: false,
      isError: false,
    } as any)

    const updateMutation = { mutateAsync: vi.fn().mockResolvedValue({ id: 'unit-1' }), isPending: false }
    useUpdateUnitMock.mockReturnValue(updateMutation as any)

    renderForm('/units/unit-1/edit')

    fireEvent.change(screen.getByLabelText('שם המסגרת'), { target: { value: 'פלוגה א - חדש' } })
    fireEvent.click(screen.getByRole('button', { name: 'שמירת מסגרת' }))

    await waitFor(() => {
      expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
        unitId: 'unit-1',
        body: {
          name: 'פלוגה א - חדש',
          description: 'ישן',
          displayOrder: 1,
        },
      })
    })

    await waitFor(() => {
      expect(screen.getByText('Units List')).toBeDefined()
    })
  })
})
