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
vi.mock('@/features/users/queries/use-users', () => ({
  useCompanyUsers: vi.fn(),
}))

import { useAuthSession } from '@/app/auth/use-auth-session'
import { useCompanyDashboard } from '@/features/dashboard/queries/use-company-dashboard'
import { DashboardPage } from '@/features/dashboard/pages/dashboard-page'
import type { CompanyDashboardResponse } from '@/features/dashboard/types/dashboard'
import { useCompanyQualifications } from '@/features/qualifications/queries/use-qualifications'
import { useCompanyRoles } from '@/features/roles/queries/use-roles'
import { useCompanyUnits } from '@/features/units/queries/use-units'
import { useCompanyUsers } from '@/features/users/queries/use-users'

const useAuthSessionMock = vi.mocked(useAuthSession)
const useCompanyDashboardMock = vi.mocked(useCompanyDashboard)
const useCompanyQualificationsMock = vi.mocked(useCompanyQualifications)
const useCompanyRolesMock = vi.mocked(useCompanyRoles)
const useCompanyUnitsMock = vi.mocked(useCompanyUnits)
const useCompanyUsersMock = vi.mocked(useCompanyUsers)

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
  upcomingActivities: [
    {
      id: 'activity-1',
      name: 'תרגיל גדודי',
      startDate: '2026-08-09T00:00:00.000Z',
      endDate: '2026-08-11T00:00:00.000Z',
      status: 'ACTIVE',
    },
  ],
  recentActivities: [
    {
      id: 'activity-2',
      name: 'אימון קרבי',
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
    useCompanyUsersMock.mockReset()

    useAuthSessionMock.mockReturnValue({
      user: { companyId: 'company-1' },
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
    useCompanyUsersMock.mockReturnValue({
      data: { total: 0, items: [] },
      isPending: false,
      isError: false,
    } as ReturnType<typeof useCompanyUsers>)
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

  it('renders empty states when the dashboard has no activities or personnel details', () => {
    const emptyDashboard: CompanyDashboardResponse = {
      companySummary: {
        totalSoldiers: 0,
        qualificationCounts: [],
        roleCounts: [],
      },
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
