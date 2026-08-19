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

const makeActivity = (overrides: Partial<Activity> = {}): Activity => {
  const now = Date.now()

  return {
    id: 'activity-default',
    companyId: 'company-1',
    name: 'פעילות לדוגמה',
    type: 'TRAINING',
    startDate: new Date(now - 86_400_000).toISOString(),
    endDate: new Date(now - 43_200_000).toISOString(),
    status: 'DRAFT',
    createdAt: new Date(now - 86_400_000).toISOString(),
    updatedAt: new Date(now - 86_400_000).toISOString(),
    ...overrides,
  }
}

const getSection = (title: string) => (
  screen.getByRole('heading', { name: title }).closest('section') as HTMLElement
)

describe('ActivitiesPage', () => {
  beforeEach(() => {
    useCompanyActivitiesMock.mockReset()
    navigateMock.mockReset()
  })

  it('renders loading state', () => {
    useCompanyActivitiesMock.mockReturnValue({ isPending: true } as ReturnType<typeof useCompanyActivities>)

    render(<ActivitiesPage />)

    expect(screen.getByText('טוען פעילויות')).toBeDefined()
  })

  it('renders error state and retries', () => {
    const refetch = vi.fn()
    useCompanyActivitiesMock.mockReturnValue({
      isPending: false,
      isError: true,
      refetch,
    } as unknown as ReturnType<typeof useCompanyActivities>)

    render(<ActivitiesPage />)

    expect(screen.getByText('טעינת הפעילויות נכשלה')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'ניסיון חוזר' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('renders empty states for planned and historical sections when the company has no activities', () => {
    useCompanyActivitiesMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [],
    } as unknown as ReturnType<typeof useCompanyActivities>)

    render(<ActivitiesPage />)

    expect(screen.getByText('אין פעילויות להצגה')).toBeDefined()
    expect(screen.getByText('לא הוגדרו עדיין פעילויות לפלוגה.')).toBeDefined()

    const createButtons = screen.getAllByRole('button', { name: 'יצירת פעילות חדשה' })
    fireEvent.click(createButtons[0]!)
    expect(navigateMock).toHaveBeenCalledWith('/activities/new')
  })

  it('renders active activity in the current section and excludes it from planned/historical lists', () => {
    const now = Date.now()
    const active = makeActivity({
      id: 'active-1',
      name: 'פעילות פעילה',
      type: 'EMPLOYMENT',
      status: 'ACTIVE',
      startDate: new Date(now - 86_400_000).toISOString(),
      endDate: new Date(now + 86_400_000).toISOString(),
    })
    const planned = makeActivity({
      id: 'planned-1',
      name: 'תכנון עתידי',
      type: 'TRAINING',
      status: 'DRAFT',
      startDate: new Date(now + 2_592_000_000).toISOString(),
      endDate: new Date(now + 3_456_000_000).toISOString(),
    })
    const historical = makeActivity({
      id: 'historical-1',
      name: 'היסטוריה',
      type: 'TRAINING_COURSE',
      status: 'COMPLETED',
      startDate: new Date(now - 8_640_000_000).toISOString(),
      endDate: new Date(now - 2_592_000_000).toISOString(),
    })

    useCompanyActivitiesMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [active, planned, historical],
    } as unknown as ReturnType<typeof useCompanyActivities>)

    render(<ActivitiesPage />)

    expect(screen.getByRole('heading', { name: 'פעילות נוכחית' })).toBeDefined()
    expect(screen.getByText('פעילות פעילה')).toBeDefined()
    expect(screen.queryAllByText('פעילות פעילה').length).toBe(1)

    const plannedSection = getSection('פעילויות בתכנון')
    const historicalSection = getSection('פעילויות היסטוריות')

    expect(plannedSection.textContent).toContain('תכנון עתידי')
    expect(historicalSection.textContent).toContain('היסטוריה')
    expect(plannedSection.textContent).not.toContain('פעילות פעילה')
    expect(historicalSection.textContent).not.toContain('פעילות פעילה')
  })

  it('does not render a current section when there is no active activity', () => {
    const planned = makeActivity({
      id: 'planned-1',
      name: 'פעילות עתידית',
      type: 'EMPLOYMENT',
      status: 'DRAFT',
      startDate: new Date(Date.now() + 86_400_000).toISOString(),
      endDate: new Date(Date.now() + 172_800_000).toISOString(),
    })

    useCompanyActivitiesMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [planned],
    } as unknown as ReturnType<typeof useCompanyActivities>)

    render(<ActivitiesPage />)

    expect(screen.queryByRole('heading', { name: 'פעילות נוכחית' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'פעילויות בתכנון' })).toBeDefined()
    expect(screen.getByRole('heading', { name: 'פעילויות היסטוריות' })).toBeDefined()
  })

  it('orders planned activities by the nearest start date first', () => {
    const now = Date.now()
    const far = makeActivity({ id: 'far', name: 'עתיד רחוק', type: 'TRAINING', status: 'DRAFT', startDate: new Date(now + 6_048_000_000).toISOString(), endDate: new Date(now + 6_307_200_000).toISOString() })
    const near = makeActivity({ id: 'near', name: 'עתיד קרוב', type: 'EMPLOYMENT', status: 'DRAFT', startDate: new Date(now + 864_000_000).toISOString(), endDate: new Date(now + 1_296_000_000).toISOString() })
    const middle = makeActivity({ id: 'mid', name: 'עתיד בינוני', type: 'TRAINING_COURSE', status: 'DRAFT', startDate: new Date(now + 2_592_000_000).toISOString(), endDate: new Date(now + 3_456_000_000).toISOString() })

    useCompanyActivitiesMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [far, near, middle],
    } as unknown as ReturnType<typeof useCompanyActivities>)

    render(<ActivitiesPage />)

    const plannedSection = getSection('פעילויות בתכנון')
    const orderedNames = Array.from(plannedSection.querySelectorAll('[data-testid^="activity-card-"]'))
      .map((node) => node.getAttribute('data-testid'))
      .filter((value): value is string => Boolean(value))

    expect(orderedNames.indexOf('activity-card-near')).toBeLessThan(orderedNames.indexOf('activity-card-mid'))
    expect(orderedNames.indexOf('activity-card-mid')).toBeLessThan(orderedNames.indexOf('activity-card-far'))
  })

  it('orders historical activities by most recent end date first', () => {
    const now = Date.now()
    const old = makeActivity({ id: 'old', name: 'ישן', type: 'TRAINING', status: 'COMPLETED', startDate: new Date(now - 7_776_000_000).toISOString(), endDate: new Date(now - 6_048_000_000).toISOString() })
    const newish = makeActivity({ id: 'newish', name: 'חדש יותר', type: 'EMPLOYMENT', status: 'CANCELLED', startDate: new Date(now - 2_592_000_000).toISOString(), endDate: new Date(now - 864_000_000).toISOString() })
    const newest = makeActivity({ id: 'newest', name: 'הכי חדש', type: 'TRAINING_COURSE', status: 'COMPLETED', startDate: new Date(now - 1_728_000_000).toISOString(), endDate: new Date(now - 432_000_000).toISOString() })

    useCompanyActivitiesMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [old, newish, newest],
    } as unknown as ReturnType<typeof useCompanyActivities>)

    render(<ActivitiesPage />)

    const historicalSection = getSection('פעילויות היסטוריות')
    const orderedNames = Array.from(historicalSection.querySelectorAll('[data-testid^="activity-card-"]'))
      .map((node) => node.getAttribute('data-testid'))
      .filter((value): value is string => Boolean(value))

    expect(orderedNames.indexOf('activity-card-newest')).toBeLessThan(orderedNames.indexOf('activity-card-newish'))
    expect(orderedNames.indexOf('activity-card-newish')).toBeLessThan(orderedNames.indexOf('activity-card-old'))
  })

  it('displays the activity type label and navigates to the details route', () => {
    const now = Date.now()
    const activity = makeActivity({
      id: 'activity-42',
      name: 'פעילות ייחודית',
      type: 'EMPLOYMENT',
      status: 'DRAFT',
      startDate: new Date(now + 86_400_000).toISOString(),
      endDate: new Date(now + 172_800_000).toISOString(),
    })

    useCompanyActivitiesMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [activity],
    } as unknown as ReturnType<typeof useCompanyActivities>)

    render(<ActivitiesPage />)

    expect(screen.getByText('פעילות')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'פתיחת פעילות' }))
    expect(navigateMock).toHaveBeenCalledWith('/activities/activity-42')
  })

  it('navigates to the create activity page from the main action', () => {
    useCompanyActivitiesMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [makeActivity({ id: 'one', status: 'DRAFT', startDate: new Date(Date.now() + 86_400_000).toISOString(), endDate: new Date(Date.now() + 172_800_000).toISOString() })],
    } as unknown as ReturnType<typeof useCompanyActivities>)

    render(<ActivitiesPage />)

    fireEvent.click(screen.getByRole('button', { name: 'יצירת פעילות חדשה' }))
    expect(navigateMock).toHaveBeenCalledWith('/activities/new')
  })

  it('renders cancelled and completed activities in historical section', () => {
    const now = Date.now()
    const cancelled = makeActivity({
      id: 'cancelled-1',
      name: 'בוטלה',
      status: 'CANCELLED',
      startDate: new Date(now - 86_400_000).toISOString(),
      endDate: new Date(now + 86_400_000).toISOString(),
    })
    const ended = makeActivity({
      id: 'ended-1',
      name: 'הסתיימה',
      status: 'DRAFT',
      startDate: new Date(now - 12_960_000_000).toISOString(),
      endDate: new Date(now - 86_400_000).toISOString(),
    })

    useCompanyActivitiesMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: [cancelled, ended],
    } as unknown as ReturnType<typeof useCompanyActivities>)

    render(<ActivitiesPage />)

    const historicalSection = getSection('פעילויות היסטוריות')
    expect(historicalSection.textContent).toContain('בוטלה')
    expect(historicalSection.textContent).toContain('הסתיימה')
  })
})
