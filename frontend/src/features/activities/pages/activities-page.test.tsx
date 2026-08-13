import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/activities/queries/use-activities', () => ({
  useCompanyActivities: vi.fn(),
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

import { useCompanyActivities } from '@/features/activities/queries/use-activities'
import { ActivitiesPage } from '@/features/activities/pages/activities-page'
import type { Activity } from '@/features/activities/types/activity'

const useCompanyActivitiesMock = vi.mocked(useCompanyActivities)

const activities: Activity[] = [
  {
    id: 'activity-1',
    companyId: 'company-1',
    name: 'אימון פלוגתי',
    startDate: '2026-08-01T00:00:00.000Z',
    endDate: '2026-08-03T00:00:00.000Z',
    status: 'DRAFT',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  },
  {
    id: 'activity-2',
    companyId: 'company-1',
    name: 'תעסוקה מבצעית',
    startDate: '2026-08-10T00:00:00.000Z',
    endDate: '2026-08-15T00:00:00.000Z',
    status: 'ACTIVE',
    createdAt: '2026-08-02T00:00:00.000Z',
    updatedAt: '2026-08-02T00:00:00.000Z',
  },
  {
    id: 'activity-3',
    companyId: 'company-1',
    name: 'סיכום רבעון',
    startDate: '2026-08-20T00:00:00.000Z',
    endDate: '2026-08-22T00:00:00.000Z',
    status: 'COMPLETED',
    createdAt: '2026-08-03T00:00:00.000Z',
    updatedAt: '2026-08-03T00:00:00.000Z',
  },
  {
    id: 'activity-4',
    companyId: 'company-1',
    name: 'תעסוקה שבוטלה',
    startDate: '2026-08-25T00:00:00.000Z',
    endDate: '2026-08-28T00:00:00.000Z',
    status: 'CANCELLED',
    createdAt: '2026-08-04T00:00:00.000Z',
    updatedAt: '2026-08-04T00:00:00.000Z',
  },
]

describe('ActivitiesPage', () => {
  beforeEach(() => {
    useCompanyActivitiesMock.mockReset()
    navigateMock.mockReset()
  })

  it('renders loading state', () => {
    useCompanyActivitiesMock.mockReturnValue({ isPending: true } as ReturnType<typeof useCompanyActivities>)

    render(<ActivitiesPage />)

    expect(screen.getByText('טוען תעסוקות')).toBeDefined()
  })

  it('renders error state and retries', () => {
    const refetch = vi.fn()
    useCompanyActivitiesMock.mockReturnValue({
      isPending: false,
      isError: true,
      refetch,
    } as unknown as ReturnType<typeof useCompanyActivities>)

    render(<ActivitiesPage />)

    expect(screen.getByText('טעינת התעסוקות נכשלה')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'ניסיון חוזר' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('renders empty state when no activities exist', () => {
    useCompanyActivitiesMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [],
    } as unknown as ReturnType<typeof useCompanyActivities>)

    render(<ActivitiesPage />)

    expect(screen.getByText('אין תעסוקות להצגה')).toBeDefined()
    expect(screen.getByText('לא הוגדרו עדיין תעסוקות לפלוגה.')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'יצירת תעסוקה ראשונה' }))
    expect(navigateMock).toHaveBeenCalledWith('/activities/new')
  })

  it('renders activities with status and dates', () => {
    useCompanyActivitiesMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: activities,
    } as unknown as ReturnType<typeof useCompanyActivities>)

    render(<ActivitiesPage />)

    expect(screen.getByText('אימון פלוגתי')).toBeDefined()
    expect(screen.getAllByText('תעסוקה מבצעית').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('סיכום רבעון')).toBeDefined()
    expect(screen.getByText('תעסוקה שבוטלה')).toBeDefined()
    expect(screen.getByText('01.08.2026-03.08.2026')).toBeDefined()
    expect(screen.getAllByText('10.08.2026-15.08.2026').length).toBeGreaterThanOrEqual(1)

    expect(screen.getByText('טיוטה')).toBeDefined()
    expect(screen.getByText('פעיל')).toBeDefined()
    expect(screen.getByText('הושלם')).toBeDefined()
    expect(screen.getByText('בוטל')).toBeDefined()
  })

  it('highlights the active activity', () => {
    useCompanyActivitiesMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: activities,
    } as unknown as ReturnType<typeof useCompanyActivities>)

    render(<ActivitiesPage />)

    expect(screen.getByText('תעסוקה פעילה כעת')).toBeDefined()
    expect(screen.getAllByText('פעילה כעת').length).toBeGreaterThanOrEqual(1)
  })

  it('navigates to future details route when opening an activity', () => {
    useCompanyActivitiesMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: activities,
    } as unknown as ReturnType<typeof useCompanyActivities>)

    render(<ActivitiesPage />)

    const openButtons = screen.getAllByRole('button', { name: 'פתיחת תעסוקה' })
    expect(openButtons.length).toBeGreaterThan(0)
    fireEvent.click(openButtons[0]!)

    expect(navigateMock).toHaveBeenCalledWith('/activities/activity-1')
  })

  it('navigates to create activity page from header action', () => {
    useCompanyActivitiesMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: activities,
    } as unknown as ReturnType<typeof useCompanyActivities>)

    render(<ActivitiesPage />)

    fireEvent.click(screen.getByRole('button', { name: 'תעסוקה חדשה' }))
    expect(navigateMock).toHaveBeenCalledWith('/activities/new')
  })
})
