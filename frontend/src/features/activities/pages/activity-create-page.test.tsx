import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/activities/queries/use-activities', () => ({
  useCreateActivity: vi.fn(),
}))

const { navigateMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

import { useCreateActivity } from '@/features/activities/queries/use-activities'
import { ActivityCreatePage } from '@/features/activities/pages/activity-create-page'

const useCreateActivityMock = vi.mocked(useCreateActivity)

describe('ActivityCreatePage', () => {
  beforeEach(() => {
    useCreateActivityMock.mockReset()
    navigateMock.mockReset()
  })

  it('renders initial form fields and actions', () => {
    useCreateActivityMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useCreateActivity>)

    render(<ActivityCreatePage />)

    expect(screen.getByRole('heading', { name: 'יצירת פעילות' })).toBeDefined()
    expect(screen.getByLabelText('שם הפעילות')).toBeDefined()
    expect(screen.getByLabelText('סוג הפעילות')).toBeDefined()
    expect(screen.getByLabelText('תאריך התחלה')).toBeDefined()
    expect(screen.getByLabelText('תאריך סיום')).toBeDefined()
    expect(screen.getByRole('button', { name: 'יצירת פעילות' })).toBeDefined()
  })

  it('validates required fields before submission', () => {
    const mutateAsync = vi.fn()
    useCreateActivityMock.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateActivity>)

    render(<ActivityCreatePage />)

    fireEvent.click(screen.getByRole('button', { name: 'יצירת פעילות' }))

    expect(screen.getByText('יש להזין שם פעילות.')).toBeDefined()
    expect(screen.getByText('יש לבחור סוג פעילות.')).toBeDefined()
    expect(screen.getByText('יש להזין תאריך התחלה.')).toBeDefined()
    expect(screen.getByText('יש להזין תאריך סיום.')).toBeDefined()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('validates end date is not before start date', () => {
    const mutateAsync = vi.fn()
    useCreateActivityMock.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateActivity>)

    render(<ActivityCreatePage />)

    fireEvent.change(screen.getByLabelText('שם הפעילות'), { target: { value: 'תעסוקת ניסוי' } })
    fireEvent.change(screen.getByLabelText('תאריך התחלה'), { target: { value: '2026-08-20' } })
    fireEvent.change(screen.getByLabelText('תאריך סיום'), { target: { value: '2026-08-10' } })

    fireEvent.click(screen.getByRole('button', { name: 'יצירת פעילות' }))

    expect(screen.getByText('תאריך הסיום לא יכול להיות לפני תאריך ההתחלה.')).toBeDefined()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('submits successfully with expected mutation input and navigates to list', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ id: 'activity-10' })
    useCreateActivityMock.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateActivity>)

    render(<ActivityCreatePage />)

    fireEvent.change(screen.getByLabelText('שם הפעילות'), { target: { value: '  תעסוקת פלוגה  ' } })
    fireEvent.click(screen.getByRole('combobox', { name: 'סוג הפעילות' }))
    fireEvent.click(screen.getByRole('option', { name: 'פעילות' }))
    fireEvent.change(screen.getByLabelText('תאריך התחלה'), { target: { value: '2026-08-10' } })
    fireEvent.change(screen.getByLabelText('תאריך סיום'), { target: { value: '2026-08-15' } })

    fireEvent.click(screen.getByRole('button', { name: 'יצירת פעילות' }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))

    expect(mutateAsync).toHaveBeenCalledWith({
      name: 'תעסוקת פלוגה',
      type: 'EMPLOYMENT',
      startDate: '2026-08-10',
      endDate: '2026-08-15',
    })
    expect(navigateMock).toHaveBeenCalledWith('/activities')
  })

  it('disables submit while mutation is pending', () => {
    useCreateActivityMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
    } as unknown as ReturnType<typeof useCreateActivity>)

    render(<ActivityCreatePage />)

    expect(screen.getByRole('button', { name: 'יצירת פעילות' }).hasAttribute('disabled')).toBe(true)
  })

  it('shows backend error message and preserves values after failure', async () => {
    const mutateAsync = vi.fn().mockRejectedValue({ status: 400, message: 'bad request' })
    useCreateActivityMock.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateActivity>)

    render(<ActivityCreatePage />)

    fireEvent.change(screen.getByLabelText('שם הפעילות'), { target: { value: 'פעילות א' } })
    fireEvent.click(screen.getByRole('combobox', { name: 'סוג הפעילות' }))
    fireEvent.click(screen.getByRole('option', { name: 'פעילות' }))
    fireEvent.change(screen.getByLabelText('תאריך התחלה'), { target: { value: '2026-08-10' } })
    fireEvent.change(screen.getByLabelText('תאריך סיום'), { target: { value: '2026-08-15' } })

    fireEvent.click(screen.getByRole('button', { name: 'יצירת פעילות' }))

    await waitFor(() => expect(screen.getByText('יצירת הפעילות נכשלה')).toBeDefined())

    expect(screen.getByText('יצירת הפעילות נכשלה')).toBeDefined()
    expect(screen.getByText('הנתונים שהוזנו אינם תקינים. בדקו את השדות ונסו שוב.')).toBeDefined()
    expect(screen.getByDisplayValue('פעילות א')).toBeDefined()
    expect(screen.getByDisplayValue('2026-08-10')).toBeDefined()
    expect(screen.getByDisplayValue('2026-08-15')).toBeDefined()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('allows cancel/back navigation', () => {
    useCreateActivityMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useCreateActivity>)

    render(<ActivityCreatePage />)

    fireEvent.click(screen.getByRole('button', { name: 'ביטול' }))
    expect(navigateMock).toHaveBeenCalledWith('/activities')
  })
})
