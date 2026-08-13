import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/dashboard/queries/use-company-dashboard', () => ({
  useCompanyDashboard: vi.fn(),
}))

import { useCompanyDashboard } from '@/features/dashboard/queries/use-company-dashboard'
import { DashboardPage } from '@/features/dashboard/pages/dashboard-page'
import type { CompanyDashboardResponse } from '@/features/dashboard/types/dashboard'

const useCompanyDashboardMock = vi.mocked(useCompanyDashboard)

const dashboardData: CompanyDashboardResponse = {
  activeActivity: {
    id: 'activity-1',
    name: 'תרגיל גדודי',
    startDate: '2026-08-09T00:00:00.000Z',
    endDate: '2026-08-11T00:00:00.000Z',
    numberOfDays: 3,
  },
  manpowerSummary: {
    totalActiveUsers: 42,
    usersParticipatingInActivity: 31,
    todayAvailabilitySummary: {
      statusCounts: { ACTIVE: 24, HOLIDAY: 4, SICK: 2, RELEASED: 1 },
    },
  },
  tasksSummary: {
    totalTaskInstances: 12,
    unassignedTaskInstances: 3,
    validationIssuesSummary: { requiredErrorCount: 2, warningCount: 1 },
  },
  validationIssues: {
    requiredErrorCount: 2,
    warningCount: 1,
    issues: [
      { type: 'MANPOWER', message: 'חסר כוח אדם נדרש' },
      { type: 'ROLE', message: 'לא שובץ בעל תפקיד' },
    ],
  },
}

describe('DashboardPage', () => {
  beforeEach(() => {
    useCompanyDashboardMock.mockReset()
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

  it('renders active activity and its dates', () => {
    useCompanyDashboardMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: dashboardData,
    } as unknown as ReturnType<typeof useCompanyDashboard>)

    render(<DashboardPage />)

    expect(screen.getByText('תרגיל גדודי')).toBeDefined()
    expect(screen.getByText('09.08.2026–11.08.2026')).toBeDefined()
    expect(screen.getByText('ימים')).toBeDefined()
  })

  it('renders manpower and task summaries from the response', () => {
    useCompanyDashboardMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: dashboardData,
    } as unknown as ReturnType<typeof useCompanyDashboard>)

    render(<DashboardPage />)

    expect(screen.getByText('42')).toBeDefined()
    expect(screen.getByText('31')).toBeDefined()
    expect(screen.getByText('12')).toBeDefined()
    expect(screen.getByText('משימות ללא שיבוץ')).toBeDefined()
    expect(screen.getByText('פעיל')).toBeDefined()
    expect(screen.getByText('חופשה')).toBeDefined()
  })

  it('renders validation counts and issue messages', () => {
    useCompanyDashboardMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: dashboardData,
    } as unknown as ReturnType<typeof useCompanyDashboard>)

    render(<DashboardPage />)

    expect(screen.getAllByText('2 שגיאות')).toHaveLength(2)
    expect(screen.getAllByText('אזהרה אחת')).toHaveLength(2)
    expect(screen.getByText('חסר כוח אדם נדרש')).toBeDefined()
    expect(screen.getByText('לא שובץ בעל תפקיד')).toBeDefined()
  })

  it('handles an absent active activity explicitly', () => {
    useCompanyDashboardMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: { ...dashboardData, activeActivity: null },
    } as unknown as ReturnType<typeof useCompanyDashboard>)

    render(<DashboardPage />)

    expect(screen.getByText('אין פעילות פעילה')).toBeDefined()
    expect(screen.getByText('לא הוגדרה כרגע פעילות פעילה לפלוגה.')).toBeDefined()
  })

  it('renders legitimate zero and empty dashboard data', () => {
    const emptyDashboard: CompanyDashboardResponse = {
      activeActivity: null,
      manpowerSummary: {
        totalActiveUsers: 0,
        usersParticipatingInActivity: 0,
        todayAvailabilitySummary: { statusCounts: {} },
      },
      tasksSummary: {
        totalTaskInstances: 0,
        unassignedTaskInstances: 0,
        validationIssuesSummary: { requiredErrorCount: 0, warningCount: 0 },
      },
      validationIssues: {
        requiredErrorCount: 0,
        warningCount: 0,
        issues: [],
      },
    }
    useCompanyDashboardMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: emptyDashboard,
    } as unknown as ReturnType<typeof useCompanyDashboard>)

    render(<DashboardPage />)

    expect(screen.getByText('אין פעילות פעילה')).toBeDefined()
    expect(screen.getByText('אין דיווחי סטטוס להיום.')).toBeDefined()
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(4)
    expect(screen.getByText('תקין')).toBeDefined()
    expect(screen.getByText('לא נמצאו בעיות אימות.')).toBeDefined()
  })
})
