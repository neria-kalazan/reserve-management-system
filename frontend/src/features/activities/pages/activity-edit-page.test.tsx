import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/activities/queries/use-activities', () => ({
  useActivityById: vi.fn(),
  useUpdateActivity: vi.fn(),
}))

const { navigateMock, useParamsMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  useParamsMock: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: useParamsMock,
  }
})

import { useActivityById, useUpdateActivity } from '@/features/activities/queries/use-activities'
import { ActivityEditPage } from '@/features/activities/pages/activity-edit-page'

const useActivityByIdMock = vi.mocked(useActivityById)
const useUpdateActivityMock = vi.mocked(useUpdateActivity)

const activityData = {
  id: 'activity-1',
  companyId: 'company-1',
  name: 'פעילות מבצעית',
  type: 'EMPLOYMENT' as const,
  startDate: '2026-08-10T00:00:00.000Z',
  endDate: '2026-08-15T00:00:00.000Z',
  status: 'ACTIVE' as const,
  createdAt: '2026-08-10T00:00:00.000Z',
  updatedAt: '2026-08-10T00:00:00.000Z',
}

describe('ActivityEditPage', () => {
  beforeEach(() => {
    useActivityByIdMock.mockReset()
    useUpdateActivityMock.mockReset()
    navigateMock.mockReset()
    useParamsMock.mockReset()
    useParamsMock.mockReturnValue({ activityId: 'activity-1' })
  })

  it('renders initial loading state while activity is loading', () => {
    useActivityByIdMock.mockReturnValue({ isPending: true } as ReturnType<typeof useActivityById>)
    useUpdateActivityMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useUpdateActivity>)

    render(<ActivityEditPage />)

    expect(screen.getByText('טוען נתוני פעילות')).toBeDefined()
  })

  it('populates form from loaded activity data', async () => {
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: { ...activityData, type: 'EMPLOYMENT' },
    } as unknown as ReturnType<typeof useActivityById>)
    useUpdateActivityMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useUpdateActivity>)

    render(<ActivityEditPage />)

    await waitFor(() => expect(screen.getByDisplayValue('פעילות מבצעית')).toBeDefined())
    expect(screen.getByDisplayValue('2026-08-10')).toBeDefined()
    expect(screen.getByDisplayValue('2026-08-15')).toBeDefined()
    expect(screen.getByText('פעילות')).toBeDefined()
  })

  it('validates required fields before submission', async () => {
    const mutateAsync = vi.fn()
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: { ...activityData, type: 'EMPLOYMENT' },
    } as unknown as ReturnType<typeof useActivityById>)
    useUpdateActivityMock.mockReturnValue({ mutateAsync, isPending: false } as unknown as ReturnType<typeof useUpdateActivity>)

    render(<ActivityEditPage />)

    await waitFor(() => expect(screen.getByDisplayValue('פעילות מבצעית')).toBeDefined())

    fireEvent.change(screen.getByLabelText('שם הפעילות'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('תאריך התחלה'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('תאריך סיום'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'שמירת שינויים' }))

    expect(screen.getByText('יש להזין שם פעילות.')).toBeDefined()
    expect(screen.getByText('יש להזין תאריך התחלה.')).toBeDefined()
    expect(screen.getByText('יש להזין תאריך סיום.')).toBeDefined()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('validates invalid date range', async () => {
    const mutateAsync = vi.fn()
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: activityData,
    } as unknown as ReturnType<typeof useActivityById>)
    useUpdateActivityMock.mockReturnValue({ mutateAsync, isPending: false } as unknown as ReturnType<typeof useUpdateActivity>)

    render(<ActivityEditPage />)

    await waitFor(() => expect(screen.getByDisplayValue('פעילות מבצעית')).toBeDefined())

    fireEvent.change(screen.getByLabelText('תאריך התחלה'), { target: { value: '2026-08-20' } })
    fireEvent.change(screen.getByLabelText('תאריך סיום'), { target: { value: '2026-08-10' } })
    fireEvent.click(screen.getByRole('button', { name: 'שמירת שינויים' }))

    expect(screen.getByText('תאריך הסיום לא יכול להיות לפני תאריך ההתחלה.')).toBeDefined()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('submits update with correct activityId and updated fields, then navigates back to details', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ id: 'activity-1' })
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: activityData,
    } as unknown as ReturnType<typeof useActivityById>)
    useUpdateActivityMock.mockReturnValue({ mutateAsync, isPending: false } as unknown as ReturnType<typeof useUpdateActivity>)

    render(<ActivityEditPage />)

    await waitFor(() => expect(screen.getByDisplayValue('פעילות מבצעית')).toBeDefined())

    fireEvent.change(screen.getByLabelText('שם הפעילות'), { target: { value: 'פעילות מעודכנת' } })
    fireEvent.click(screen.getByRole('combobox', { name: 'סוג הפעילות' }))
    fireEvent.click(screen.getByRole('option', { name: 'אימון' }))
    fireEvent.change(screen.getByLabelText('תאריך התחלה'), { target: { value: '2026-08-11' } })
    fireEvent.change(screen.getByLabelText('תאריך סיום'), { target: { value: '2026-08-16' } })

    fireEvent.click(screen.getByRole('button', { name: 'שמירת שינויים' }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))

    expect(mutateAsync).toHaveBeenCalledWith({
      activityId: 'activity-1',
      body: {
        name: 'פעילות מעודכנת',
        type: 'TRAINING',
        startDate: '2026-08-11',
        endDate: '2026-08-16',
      },
    })
    expect(navigateMock).toHaveBeenCalledWith('/activities/activity-1')
  })

  it('disables submit while update mutation is pending', async () => {
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: activityData,
    } as unknown as ReturnType<typeof useActivityById>)
    useUpdateActivityMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: true } as unknown as ReturnType<typeof useUpdateActivity>)

    render(<ActivityEditPage />)

    await waitFor(() => expect(screen.getByDisplayValue('פעילות מבצעית')).toBeDefined())

    expect(screen.getByRole('button', { name: 'שמירת שינויים' }).hasAttribute('disabled')).toBe(true)
  })

  it('shows backend error and preserves entered values after failed submission', async () => {
    const mutateAsync = vi.fn().mockRejectedValue({ status: 400, message: 'bad request' })
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: activityData,
    } as unknown as ReturnType<typeof useActivityById>)
    useUpdateActivityMock.mockReturnValue({ mutateAsync, isPending: false } as unknown as ReturnType<typeof useUpdateActivity>)

    render(<ActivityEditPage />)

    await waitFor(() => expect(screen.getByDisplayValue('פעילות מבצעית')).toBeDefined())

    fireEvent.change(screen.getByLabelText('שם הפעילות'), { target: { value: 'שם חדש' } })
    fireEvent.click(screen.getByRole('combobox', { name: 'סוג הפעילות' }))
    fireEvent.click(screen.getByRole('option', { name: 'אימון' }))
    fireEvent.change(screen.getByLabelText('תאריך התחלה'), { target: { value: '2026-08-10' } })
    fireEvent.change(screen.getByLabelText('תאריך סיום'), { target: { value: '2026-08-15' } })
    fireEvent.click(screen.getByRole('button', { name: 'שמירת שינויים' }))

    await waitFor(() => expect(screen.getByText('שמירת השינויים נכשלה')).toBeDefined())

    expect(screen.getByText('הנתונים שהוזנו אינם תקינים. בדקו את השדות ונסו שוב.')).toBeDefined()
    expect(screen.getByDisplayValue('שם חדש')).toBeDefined()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('supports cancel/back navigation to details', async () => {
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: activityData,
    } as unknown as ReturnType<typeof useActivityById>)
    useUpdateActivityMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useUpdateActivity>)

    render(<ActivityEditPage />)

    await waitFor(() => expect(screen.getByDisplayValue('פעילות מבצעית')).toBeDefined())

    fireEvent.click(screen.getByRole('button', { name: 'ביטול' }))
    expect(navigateMock).toHaveBeenCalledWith('/activities/activity-1')
  })

  it('handles activity load 404 safely', () => {
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: true,
      error: { status: 404, message: 'not found' },
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActivityById>)
    useUpdateActivityMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useUpdateActivity>)

    render(<ActivityEditPage />)

    expect(screen.getByText('הפעילות לא נמצאה')).toBeDefined()
    expect(screen.getByText('לא ניתן לערוך פעילות שלא נמצאה. אפשר לחזור לרשימת הפעילויות.')).toBeDefined()
  })

  it('handles missing route param safely', () => {
    useParamsMock.mockReturnValue({})
    useActivityByIdMock.mockReturnValue({ isPending: false } as ReturnType<typeof useActivityById>)
    useUpdateActivityMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useUpdateActivity>)

    render(<ActivityEditPage />)

    expect(screen.getByText('מזהה פעילות חסר')).toBeDefined()
  })
})
