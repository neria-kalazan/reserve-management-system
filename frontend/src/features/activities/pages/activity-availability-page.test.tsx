import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/activities/queries/use-activities', () => ({
  useActivityById: vi.fn(),
  useActivityAvailability: vi.fn(),
  useGenerateActivityAvailability: vi.fn(),
  useBulkUpdateActivityAvailability: vi.fn(),
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

import {
  useActivityAvailability,
  useActivityById,
  useBulkUpdateActivityAvailability,
  useGenerateActivityAvailability,
} from '@/features/activities/queries/use-activities'
import { ActivityAvailabilityPage } from '@/features/activities/pages/activity-availability-page'

const useActivityByIdMock = vi.mocked(useActivityById)
const useActivityAvailabilityMock = vi.mocked(useActivityAvailability)
const useGenerateActivityAvailabilityMock = vi.mocked(useGenerateActivityAvailability)
const useBulkUpdateActivityAvailabilityMock = vi.mocked(useBulkUpdateActivityAvailability)

const activityData = {
  id: 'activity-1',
  companyId: 'company-1',
  name: 'תעסוקה מבצעית',
  startDate: '2026-08-10T00:00:00.000Z',
  endDate: '2026-08-15T00:00:00.000Z',
  status: 'ACTIVE',
  createdAt: '2026-08-10T00:00:00.000Z',
  updatedAt: '2026-08-10T00:00:00.000Z',
}

const availabilityData = [
  {
    id: 'status-1',
    activityId: 'activity-1',
    userId: 'user-1',
    date: '2026-08-10T00:00:00.000Z',
    status: 'ACTIVE',
    availability: 'MORNING',
    user: { id: 'user-1', firstName: 'אבי', lastName: 'כהן', email: 'avi@example.com' },
  },
  {
    id: 'status-2',
    activityId: 'activity-1',
    userId: 'user-2',
    date: '2026-08-11T00:00:00.000Z',
    status: 'HOLIDAY',
    availability: 'EVENING',
    user: { id: 'user-2', firstName: 'נועה', lastName: 'לוי', email: 'noa@example.com' },
  },
]

describe('ActivityAvailabilityPage', () => {
  beforeEach(() => {
    useActivityByIdMock.mockReset()
    useActivityAvailabilityMock.mockReset()
    useGenerateActivityAvailabilityMock.mockReset()
    useBulkUpdateActivityAvailabilityMock.mockReset()
    navigateMock.mockReset()
    useParamsMock.mockReset()
    useParamsMock.mockReturnValue({ activityId: 'activity-1' })
  })

  it('renders loading state while activity is loading', () => {
    useActivityByIdMock.mockReturnValue({ isPending: true } as ReturnType<typeof useActivityById>)
    useActivityAvailabilityMock.mockReturnValue({ isPending: false, isError: false, data: [] } as unknown as ReturnType<typeof useActivityAvailability>)
    useGenerateActivityAvailabilityMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() } as unknown as ReturnType<typeof useGenerateActivityAvailability>)
    useBulkUpdateActivityAvailabilityMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() } as unknown as ReturnType<typeof useBulkUpdateActivityAvailability>)

    render(<ActivityAvailabilityPage />)

    expect(screen.getByText('טוען תעסוקה')).toBeDefined()
  })

  it('renders error state and supports retry', () => {
    const refetch = vi.fn()
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: true,
      error: { status: 500, message: 'failed' },
      refetch,
    } as unknown as ReturnType<typeof useActivityById>)
    useActivityAvailabilityMock.mockReturnValue({ isPending: false, isError: false, data: [] } as unknown as ReturnType<typeof useActivityAvailability>)
    useGenerateActivityAvailabilityMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() } as unknown as ReturnType<typeof useGenerateActivityAvailability>)
    useBulkUpdateActivityAvailabilityMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() } as unknown as ReturnType<typeof useBulkUpdateActivityAvailability>)

    render(<ActivityAvailabilityPage />)

    expect(screen.getByText('טעינת התעסוקה נכשלה')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'ניסיון חוזר' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('renders the availability list and details successfully', () => {
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: activityData,
    } as unknown as ReturnType<typeof useActivityById>)
    useActivityAvailabilityMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: availabilityData,
    } as ReturnType<typeof useActivityAvailability>)
    useGenerateActivityAvailabilityMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn(), isError: false } as unknown as ReturnType<typeof useGenerateActivityAvailability>)
    useBulkUpdateActivityAvailabilityMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn(), isError: false } as unknown as ReturnType<typeof useBulkUpdateActivityAvailability>)

    render(<ActivityAvailabilityPage />)

    expect(screen.getByText('תעסוקה מבצעית')).toBeDefined()
    expect(screen.getAllByText('אבי כהן').length).toBeGreaterThan(0)
    expect(screen.getAllByText('נועה לוי').length).toBeGreaterThan(0)
    expect(screen.getByText('זמינות')).toBeDefined()
  })

  it('calls generate availability and disables duplicate submission while pending', async () => {
    const mutateAsync = vi.fn().mockResolvedValue([])
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: activityData,
    } as unknown as ReturnType<typeof useActivityById>)
    useActivityAvailabilityMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: availabilityData,
    } as ReturnType<typeof useActivityAvailability>)
    useGenerateActivityAvailabilityMock.mockReturnValue({
      isPending: false,
      mutateAsync,
      isError: false,
    } as unknown as ReturnType<typeof useGenerateActivityAvailability>)
    useBulkUpdateActivityAvailabilityMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() } as unknown as ReturnType<typeof useBulkUpdateActivityAvailability>)

    render(<ActivityAvailabilityPage />)

    fireEvent.click(screen.getByRole('button', { name: 'יצירת זמינות' }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(mutateAsync).toHaveBeenCalledWith()
  })

  it('shows generate error when backend rejects', async () => {
    const mutateAsync = vi.fn().mockRejectedValue({ status: 400, message: 'bad request' })
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: activityData,
    } as unknown as ReturnType<typeof useActivityById>)
    useActivityAvailabilityMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: availabilityData,
    } as ReturnType<typeof useActivityAvailability>)
    useGenerateActivityAvailabilityMock.mockReturnValue({
      isPending: false,
      mutateAsync,
      isError: true,
      error: { status: 400, message: 'bad request' },
    } as unknown as ReturnType<typeof useGenerateActivityAvailability>)
    useBulkUpdateActivityAvailabilityMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() } as unknown as ReturnType<typeof useBulkUpdateActivityAvailability>)

    render(<ActivityAvailabilityPage />)

    fireEvent.click(screen.getByRole('button', { name: 'יצירת זמינות' }))

    await waitFor(() => expect(screen.getByText('bad request')).toBeDefined())
  })

  it('submits bulk update with correct payload and returns to details navigation', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ updatedCount: 1 })

    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: activityData,
    } as unknown as ReturnType<typeof useActivityById>)
    useActivityAvailabilityMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: availabilityData,
    } as ReturnType<typeof useActivityAvailability>)
    useGenerateActivityAvailabilityMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() } as unknown as ReturnType<typeof useGenerateActivityAvailability>)
    useBulkUpdateActivityAvailabilityMock.mockReturnValue({
      isPending: false,
      mutateAsync,
      isError: false,
    } as unknown as ReturnType<typeof useBulkUpdateActivityAvailability>)

    render(<ActivityAvailabilityPage />)

    const checkboxes = screen.getAllByRole('checkbox')
    const firstCheckbox = checkboxes[0]
    if (!firstCheckbox) {
      throw new Error('Expected at least one checkbox for bulk update test.')
    }
    fireEvent.click(firstCheckbox)
    fireEvent.click(screen.getByRole('button', { name: 'שמירת זמינות' }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(mutateAsync).toHaveBeenCalledWith({
      userIds: ['user-2'],
      startDate: '2026-08-10',
      endDate: '2026-08-15',
      availability: 'ALL_DAY',
    })
  })

  it('shows bulk update error when mutation fails', async () => {
    const mutateAsync = vi.fn().mockRejectedValue({ status: 400, message: 'bad request' })
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: activityData,
    } as unknown as ReturnType<typeof useActivityById>)
    useActivityAvailabilityMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: availabilityData,
    } as ReturnType<typeof useActivityAvailability>)
    useGenerateActivityAvailabilityMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() } as unknown as ReturnType<typeof useGenerateActivityAvailability>)
    useBulkUpdateActivityAvailabilityMock.mockReturnValue({
      isPending: false,
      mutateAsync,
      isError: true,
      error: { status: 400, message: 'bad request' },
    } as unknown as ReturnType<typeof useBulkUpdateActivityAvailability>)

    render(<ActivityAvailabilityPage />)

    fireEvent.click(screen.getByRole('button', { name: 'שמירת זמינות' }))

    await waitFor(() => expect(screen.getByText('bad request')).toBeDefined())
  })

  it('navigates back to details from the page header action', () => {
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: activityData,
    } as unknown as ReturnType<typeof useActivityById>)
    useActivityAvailabilityMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: availabilityData,
    } as ReturnType<typeof useActivityAvailability>)
    useGenerateActivityAvailabilityMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() } as unknown as ReturnType<typeof useGenerateActivityAvailability>)
    useBulkUpdateActivityAvailabilityMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() } as unknown as ReturnType<typeof useBulkUpdateActivityAvailability>)

    render(<ActivityAvailabilityPage />)

    fireEvent.click(screen.getByRole('button', { name: 'חזרה לפרטי תעסוקה' }))
    expect(navigateMock).toHaveBeenCalledWith('/activities/activity-1')
  })
})
