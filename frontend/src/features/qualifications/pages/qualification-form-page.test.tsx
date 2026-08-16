import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/app/auth/use-auth-session', () => ({
  useAuthSession: vi.fn(),
}))

vi.mock('@/features/qualifications/queries/use-qualifications', () => ({
  useQualificationById: vi.fn(),
  useCreateQualification: vi.fn(),
  useUpdateQualification: vi.fn(),
}))

import { useAuthSession } from '@/app/auth/use-auth-session'
import { QualificationFormPage } from '@/features/qualifications/pages/qualification-form-page'
import { useCreateQualification, useQualificationById, useUpdateQualification } from '@/features/qualifications/queries/use-qualifications'

const useAuthSessionMock = vi.mocked(useAuthSession)
const useQualificationByIdMock = vi.mocked(useQualificationById)
const useCreateQualificationMock = vi.mocked(useCreateQualification)
const useUpdateQualificationMock = vi.mocked(useUpdateQualification)

const renderForm = (initialEntry = '/qualifications/new') => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/qualifications/new" element={<QualificationFormPage />} />
          <Route path="/qualifications/:qualificationId/edit" element={<QualificationFormPage />} />
          <Route path="/qualifications" element={<div>Qualifications List</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('QualificationFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useAuthSessionMock.mockReturnValue({
      user: { companyId: 'company-1' },
    } as ReturnType<typeof useAuthSession>)

    useQualificationByIdMock.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: false,
    } as any)

    useCreateQualificationMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any)

    useUpdateQualificationMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any)
  })

  it('renders create mode', () => {
    renderForm('/qualifications/new')

    expect(screen.getAllByText('יצירת הסמכה').length).toBeGreaterThan(0)
    expect(screen.getByLabelText('שם ההסמכה')).toBeDefined()
    expect(screen.getByLabelText('תיאור')).toBeDefined()
  })

  it('validates required fields before submit', async () => {
    const createMutation = { mutateAsync: vi.fn(), isPending: false }
    useCreateQualificationMock.mockReturnValue(createMutation as any)

    renderForm('/qualifications/new')
    fireEvent.click(screen.getByRole('button', { name: 'שמירת הסמכה' }))

    expect(await screen.findByText('יש להזין שם הסמכה.')).toBeDefined()
    expect(createMutation.mutateAsync).not.toHaveBeenCalled()
  })

  it('loads existing data in edit mode', () => {
    useQualificationByIdMock.mockReturnValue({
      data: { id: 'qualification-1', name: 'רופא', description: 'מותר לתרופות' },
      isPending: false,
      isError: false,
    } as any)

    renderForm('/qualifications/qualification-1/edit')

    expect(screen.getAllByText('עריכת הסמכה').length).toBeGreaterThan(0)
    expect(screen.getByDisplayValue('רופא')).toBeDefined()
    expect(screen.getByDisplayValue('מותר לתרופות')).toBeDefined()
  })

  it('creates a qualification and navigates back to qualifications list', async () => {
    const createMutation = { mutateAsync: vi.fn().mockResolvedValue({ id: 'q-1' }), isPending: false }
    useCreateQualificationMock.mockReturnValue(createMutation as any)

    renderForm('/qualifications/new')

    fireEvent.change(screen.getByLabelText('שם ההסמכה'), { target: { value: 'טיפול נמרץ' } })
    fireEvent.change(screen.getByLabelText('תיאור'), { target: { value: 'הסמכה מומחית' } })
    fireEvent.click(screen.getByRole('button', { name: 'שמירת הסמכה' }))

    await waitFor(() => {
      expect(createMutation.mutateAsync).toHaveBeenCalledWith({
        name: 'טיפול נמרץ',
        description: 'הסמכה מומחית',
      })
    })

    await waitFor(() => {
      expect(screen.getByText('Qualifications List')).toBeDefined()
    })
  })

  it('updates a qualification and navigates back to qualifications list', async () => {
    useQualificationByIdMock.mockReturnValue({
      data: { id: 'qualification-1', name: 'רופא', description: 'ישן' },
      isPending: false,
      isError: false,
    } as any)

    const updateMutation = { mutateAsync: vi.fn().mockResolvedValue({ id: 'qualification-1' }), isPending: false }
    useUpdateQualificationMock.mockReturnValue(updateMutation as any)

    renderForm('/qualifications/qualification-1/edit')

    fireEvent.change(screen.getByLabelText('שם ההסמכה'), { target: { value: 'רופא בכיר' } })
    fireEvent.click(screen.getByRole('button', { name: 'שמירת הסמכה' }))

    await waitFor(() => {
      expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
        qualificationId: 'qualification-1',
        body: {
          name: 'רופא בכיר',
          description: 'ישן',
        },
      })
    })

    await waitFor(() => {
      expect(screen.getByText('Qualifications List')).toBeDefined()
    })
  })
})
