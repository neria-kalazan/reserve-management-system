import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/activities/queries/use-activity-tasks', () => ({
  useCreateActivityTask: vi.fn(),
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

import { useCreateActivityTask } from '@/features/activities/queries/use-activity-tasks'
import { ActivityTaskCreatePage } from '@/features/activities/pages/activity-task-create-page'

const useCreateActivityTaskMock = vi.mocked(useCreateActivityTask)

describe('ActivityTaskCreatePage', () => {
  beforeEach(() => {
    useCreateActivityTaskMock.mockReset()
    navigateMock.mockReset()
    useParamsMock.mockReset()
    useParamsMock.mockReturnValue({ activityId: 'activity-1' })
  })

  it('renders the create task form', () => {
    useCreateActivityTaskMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useCreateActivityTask>)

    render(<ActivityTaskCreatePage />)

    expect(screen.getByRole('heading', { name: 'יצירת משימה' })).toBeDefined()
    expect(screen.getByLabelText('שם המשימה')).toBeDefined()
    expect(screen.getByLabelText('תיאור')).toBeDefined()
  })

  it('validates required name before submission', async () => {
    const mutateAsync = vi.fn()
    useCreateActivityTaskMock.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateActivityTask>)

    render(<ActivityTaskCreatePage />)

    fireEvent.click(screen.getByRole('button', { name: 'יצירת משימה' }))

    await waitFor(() => expect(screen.getByText('יש להזין שם משימה.')).toBeDefined())
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('submits the correct payload and navigates back to activity details on success', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ id: 'task-1' })
    useCreateActivityTaskMock.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateActivityTask>)

    render(<ActivityTaskCreatePage />)

    fireEvent.change(screen.getByLabelText('שם המשימה'), { target: { value: 'הכנה' } })
    fireEvent.change(screen.getByLabelText('תיאור'), { target: { value: 'בדיקת ציוד' } })
    fireEvent.click(screen.getByRole('button', { name: 'יצירת משימה' }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(mutateAsync).toHaveBeenCalledWith({
      name: 'הכנה',
      description: 'בדיקת ציוד',
    })
    expect(navigateMock).toHaveBeenCalledWith('/activities/activity-1')
  })

  it('keeps values entered after backend rejection', async () => {
    const mutateAsync = vi.fn().mockRejectedValue({ status: 400, message: 'invalid' })
    useCreateActivityTaskMock.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateActivityTask>)

    render(<ActivityTaskCreatePage />)

    fireEvent.change(screen.getByLabelText('שם המשימה'), { target: { value: 'הכנה' } })
    fireEvent.change(screen.getByLabelText('תיאור'), { target: { value: 'בדיקת ציוד' } })
    fireEvent.click(screen.getByRole('button', { name: 'יצירת משימה' }))

    await waitFor(() => expect(screen.getByText('השמירה נכשלה')).toBeDefined())
    expect(screen.getByDisplayValue('הכנה')).toBeDefined()
    expect(screen.getByDisplayValue('בדיקת ציוד')).toBeDefined()
  })

  it('supports cancel/back navigation without submitting', async () => {
    const mutateAsync = vi.fn()
    useCreateActivityTaskMock.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateActivityTask>)

    render(<ActivityTaskCreatePage />)

    const cancelButtons = screen.getAllByRole('button', { name: 'ביטול' })
    const cancelButton = cancelButtons[0]
    expect(cancelButton).toBeDefined()
    fireEvent.click(cancelButton as HTMLElement)
    expect(navigateMock).toHaveBeenCalledWith('/activities/activity-1')
    expect(mutateAsync).not.toHaveBeenCalled()
  })
})
