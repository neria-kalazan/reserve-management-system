import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/app/auth/use-auth-session', () => ({
  useAuthSession: vi.fn(),
}))
vi.mock('@/features/dashboard/queries/use-company-dashboard', () => ({
  useCompanyDashboard: vi.fn(),
}))
vi.mock('@/features/qualifications/queries/use-qualifications', () => ({
  useCompanyQualifications: vi.fn(),
}))
vi.mock('@/features/roles/queries/use-roles', () => ({
  useCompanyRoles: vi.fn(),
}))
vi.mock('@/features/units/queries/use-units', () => ({
  useCompanyUnits: vi.fn(),
}))
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

import { useAuthSession } from '@/app/auth/use-auth-session'
import { useCompanyDashboard } from '@/features/dashboard/queries/use-company-dashboard'
import { DashboardPage } from '@/features/dashboard/pages/dashboard-page'
import type { CompanyDashboardResponse } from '@/features/dashboard/types/dashboard'
import { useCompanyQualifications } from '@/features/qualifications/queries/use-qualifications'
import { useCompanyRoles } from '@/features/roles/queries/use-roles'
import { useCompanyUnits } from '@/features/units/queries/use-units'

const { navigateMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
}))

const useAuthSessionMock = vi.mocked(useAuthSession)
const useCompanyDashboardMock = vi.mocked(useCompanyDashboard)
const useCompanyQualificationsMock = vi.mocked(useCompanyQualifications)
const useCompanyRolesMock = vi.mocked(useCompanyRoles)
const useCompanyUnitsMock = vi.mocked(useCompanyUnits)

const dashboardData: CompanyDashboardResponse = {
  companySummary: {
    totalSoldiers: 42,
    qualificationCounts: [
      { name: 'רופא', count: 3 },
      { name: 'נווט', count: 4 },
    ],
    roleCounts: [
      { name: 'מ"פ', count: 5 },
      { name: 'קצין', count: 2 },
    ],
  },
  roleHolders: [],
  upcomingActivities: [
    {
      id: 'activity-1',
      name: 'תרגיל גדודי',
      type: 'TRAINING',
      startDate: '2026-08-09T00:00:00.000Z',
      endDate: '2026-08-11T00:00:00.000Z',
      status: 'ACTIVE',
    },
  ],
  recentActivities: [
    {
      id: 'activity-2',
      name: 'אימון קרבי',
      type: 'EMPLOYMENT',
      startDate: '2026-07-15T00:00:00.000Z',
      endDate: '2026-07-17T00:00:00.000Z',
      status: 'COMPLETED',
    },
  ],
}

describe('DashboardPage', () => {
  beforeEach(() => {
    useAuthSessionMock.mockReset()
    useCompanyDashboardMock.mockReset()
    useCompanyQualificationsMock.mockReset()
    useCompanyRolesMock.mockReset()
    useCompanyUnitsMock.mockReset()
    navigateMock.mockReset()

    useAuthSessionMock.mockReturnValue({
      user: { companyId: 'company-1', companyName: 'פלוגת דפנה' },
    } as ReturnType<typeof useAuthSession>)
    useCompanyQualificationsMock.mockReturnValue({
      data: { total: 0, items: [] },
      isPending: false,
      isError: false,
    } as ReturnType<typeof useCompanyQualifications>)
    useCompanyRolesMock.mockReturnValue({
      data: { total: 0, items: [] },
      isPending: false,
      isError: false,
    } as ReturnType<typeof useCompanyRoles>)
    useCompanyUnitsMock.mockReturnValue({
      data: { total: 0, items: [] },
      isPending: false,
      isError: false,
    } as ReturnType<typeof useCompanyUnits>)
  })

  it('renders the authenticated company name as the page title and omits the subtitle', () => {
    useCompanyDashboardMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: dashboardData,
    } as unknown as ReturnType<typeof useCompanyDashboard>)

    render(<DashboardPage />)

    expect(screen.getByRole('heading', { name: 'פלוגת דפנה' })).toBeDefined()
    expect(screen.queryByText('תמונת מצב עדכנית של הפלוגה')).toBeNull()
  })

  it('renders the query loading state', () => {
    useCompanyDashboardMock.mockReturnValue({ isPending: true } as ReturnType<typeof useCompanyDashboard>)

    render(<DashboardPage />)

    expect(screen.getByText('טוען דשבורד')).toBeDefined()
  })

  it('renders the existing error state and retries the query', () => {
    const refetch = vi.fn()
    useCompanyDashboardMock.mockReturnValue({
      isPending: false,
      isError: true,
      error: new Error('Network error'),
      refetch,
    } as unknown as ReturnType<typeof useCompanyDashboard>)

    render(<DashboardPage />)
    fireEvent.click(screen.getByRole('button', { name: 'ניסיון חוזר' }))

    expect(screen.getByText('טעינת הדשבורד נכשלה')).toBeDefined()
    expect(screen.getByText('לא הצלחנו לטעון את נתוני הדשבורד. אפשר לנסות שוב.')).toBeDefined()
    expect(screen.queryByText('Network error')).toBeNull()
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('renders role holders from the dashboard response without loading all personnel', () => {
    useCompanyDashboardMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        ...dashboardData,
        roleHolders: [
          { roleId: 'r-2', roleName: 'מ"פ', holderId: 'u-2', holderFirstName: 'יונתן', holderLastName: 'ישראלי', unitId: 'unit-1', unitName: 'מחלקה א', unitDisplayOrder: 1 },
          { roleId: 'r-1', roleName: 'סמ"פ', holderId: 'u-1', holderFirstName: 'שמשון', holderLastName: '', unitId: 'unit-1', unitName: 'מחלקה א', unitDisplayOrder: 1 },
          { roleId: 'r-3', roleName: 'נאמן כ"א', holderId: 'u-3', holderFirstName: 'יוסי', holderLastName: 'כהן', unitId: 'unit-2', unitName: 'מחלקה ב', unitDisplayOrder: 2 },
          { roleId: 'r-4', roleName: 'קצין', holderId: 'u-3', holderFirstName: 'יוסי', holderLastName: 'כהן', unitId: 'unit-2', unitName: 'מחלקה ב', unitDisplayOrder: 2 },
        ],
      },
    } as unknown as ReturnType<typeof useCompanyDashboard>)

    render(<DashboardPage />)

    expect(screen.getByText('סמ"פ — שמשון')).toBeDefined()
    expect(screen.getByText('מ"פ — יונתן ישראלי')).toBeDefined()
    expect(screen.getByText('נאמן כ"א — יוסי כהן')).toBeDefined()
    expect(screen.getByText('קצין — יוסי כהן')).toBeDefined()
    expect(screen.queryByText('אין מחזיקי תפקידים להצגה')).toBeNull()

    const heading = screen.getByRole('heading', { name: 'מחזיקי תפקידים' })
    const section = heading.closest('section')
    expect(section).not.toBeNull()

    const items = Array.from(section!.querySelectorAll('li')).map((item) => item.textContent)
    expect(items).toEqual(['מ"פ — יונתן ישראלי', 'סמ"פ — שמשון', 'נאמן כ"א — יוסי כהן', 'קצין — יוסי כהן'])
  })

  it('renders the company summary and activity sections', () => {
    useCompanyDashboardMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: dashboardData,
    } as unknown as ReturnType<typeof useCompanyDashboard>)

    render(<DashboardPage />)

    expect(screen.getByText('כוח אדם פעילים')).toBeDefined()
    expect(screen.getByText('42')).toBeDefined()
    expect(screen.getAllByText('הסמכות').length).toBeGreaterThan(0)
    expect(screen.getAllByText('תפקידים').length).toBeGreaterThan(0)
    expect(screen.getByText('פעילויות קרובות')).toBeDefined()
    expect(screen.getByText('תרגיל גדודי')).toBeDefined()
    expect(screen.getByText('פעילות אחרונה')).toBeDefined()
    expect(screen.getByText('אימון קרבי')).toBeDefined()
  })

  it('renders the correct action labels for each activity type and keeps the activity content unchanged', () => {
    useCompanyDashboardMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        ...dashboardData,
        upcomingActivities: [
          {
            id: 'training-1',
            name: 'אימון ימי',
            type: 'TRAINING',
            startDate: '2026-08-09T00:00:00.000Z',
            endDate: '2026-08-11T00:00:00.000Z',
            status: 'ACTIVE',
          },
        ],
        recentActivities: [
          {
            id: 'employment-1',
            name: 'פעילות מבצעית',
            type: 'EMPLOYMENT',
            startDate: '2026-07-15T00:00:00.000Z',
            endDate: '2026-07-17T00:00:00.000Z',
            status: 'COMPLETED',
          },
          {
            id: 'course-1',
            name: 'השתלמות תפעולית',
            type: 'TRAINING_COURSE',
            startDate: '2026-06-20T00:00:00.000Z',
            endDate: '2026-06-25T00:00:00.000Z',
            status: 'CANCELLED',
          },
        ],
      },
    } as unknown as ReturnType<typeof useCompanyDashboard>)

    render(<DashboardPage />)

    expect(screen.getByText('אימון ימי')).toBeDefined()
    expect(screen.getByText('פעילות מבצעית')).toBeDefined()
    expect(screen.getByText('השתלמות תפעולית')).toBeDefined()
    expect(screen.getByRole('button', { name: 'לפרטי האימון' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'לפרטי התעסוקה' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'לפרטי ההשתלמות' })).toBeDefined()
  })

  it('navigates to the activity details route from both activity sections', () => {
    useCompanyDashboardMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        ...dashboardData,
        upcomingActivities: [
          {
            id: 'upcoming-1',
            name: 'תכנון עתידי',
            type: 'TRAINING',
            startDate: '2026-08-20T00:00:00.000Z',
            endDate: '2026-08-25T00:00:00.000Z',
            status: 'ACTIVE',
          },
        ],
        recentActivities: [
          {
            id: 'recent-1',
            name: 'פעילות ישנה',
            type: 'EMPLOYMENT',
            startDate: '2026-07-01T00:00:00.000Z',
            endDate: '2026-07-03T00:00:00.000Z',
            status: 'COMPLETED',
          },
        ],
      },
    } as unknown as ReturnType<typeof useCompanyDashboard>)

    render(<DashboardPage />)

    fireEvent.click(screen.getByRole('button', { name: 'לפרטי האימון' }))
    expect(navigateMock).toHaveBeenCalledWith('/activities/upcoming-1')

    fireEvent.click(screen.getByRole('button', { name: 'לפרטי הפעילות' }))
    expect(navigateMock).toHaveBeenCalledWith('/activities/recent-1')
  })

  it('renders empty states when the dashboard has no activities or personnel details', () => {
    const emptyDashboard: CompanyDashboardResponse = {
      companySummary: {
        totalSoldiers: 0,
        qualificationCounts: [],
        roleCounts: [],
      },
      roleHolders: [],
      upcomingActivities: [],
      recentActivities: [],
    }

    useCompanyDashboardMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: emptyDashboard,
    } as unknown as ReturnType<typeof useCompanyDashboard>)

    render(<DashboardPage />)

    expect(screen.getByText('אין פעילויות קרובות')).toBeDefined()
    expect(screen.getByText('אין פעילות אחרונה')).toBeDefined()
    expect(screen.getAllByText('0').length).toBeGreaterThan(0)
  })
})
