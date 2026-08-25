import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/app/auth', () => ({
  PermissionGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/features/activities/queries/use-activities', () => ({
  useCompanyActivities: vi.fn(),
}))

import { useCompanyActivities } from '@/features/activities/queries/use-activities'
import { Sidebar } from '@/app/layout/sidebar'

const useCompanyActivitiesMock = vi.mocked(useCompanyActivities)

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useCompanyActivitiesMock.mockReturnValue({ data: [] } as any)
  })

  it('renders only the implemented company-level navigation items when there is no active activity', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: /דשבורד/i }).getAttribute('href')).toBe('/dashboard')
    expect(screen.getByRole('link', { name: /פעילויות/i }).getAttribute('href')).toBe('/activities')
    expect(screen.getByRole('link', { name: /כוח אדם/i }).getAttribute('href')).toBe('/users')
    expect(screen.getByRole('link', { name: /תפקידים/i }).getAttribute('href')).toBe('/roles')
    expect(screen.getByRole('link', { name: /הסמכות/i }).getAttribute('href')).toBe('/qualifications')
    expect(screen.getByRole('link', { name: /מסגרות/i }).getAttribute('href')).toBe('/units')

    expect(screen.queryByRole('link', { name: /פעילות/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /שיבוץ/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /פלוגות/i })).toBeNull()
  })

  it('renders a single current activity section when there is an active activity', () => {
    useCompanyActivitiesMock.mockReturnValue({
      data: [
        {
          id: 'activity-1',
          name: 'מבצע אבירים',
          status: 'ACTIVE',
          startDate: '2026-08-01',
          endDate: '2026-08-10',
          type: 'EMPLOYMENT',
          companyId: 'company-1',
        },
      ],
    } as any)

    const { container } = render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    )

    expect(container.querySelector('[data-sidebar-activity-section="true"]')).not.toBeNull()
    expect(screen.queryByText('פעילות')).toBeNull()
    expect(screen.getByText('מבצע אבירים')).toBeTruthy()

    const dashboardLinks = screen.getAllByRole('link').filter((link) => link.textContent?.includes('דשבורד'))
    expect(dashboardLinks.some((link) => link.getAttribute('href') === '/activities/activity-1')).toBe(true)
    expect(dashboardLinks.some((link) => link.getAttribute('href') === '/dashboard')).toBe(true)

    expect(screen.getByRole('link', { name: /טבלת נוכחות/i }).getAttribute('href')).toBe('/activities/activity-1/personnel-status-matrix')
    expect(screen.getByRole('link', { name: /טבלת שיבוץ/i }).getAttribute('href')).toBe('/activities/activity-1/planning')
    expect(screen.getByRole('link', { name: /משימות/i }).getAttribute('href')).toBe('/activities/activity-1/tasks')
  })

  it('marks the activity dashboard as active only on the exact dashboard route', () => {
    useCompanyActivitiesMock.mockReturnValue({
      data: [
        {
          id: 'activity-1',
          name: 'מבצע אבירים',
          status: 'ACTIVE',
          startDate: '2026-08-01',
          endDate: '2026-08-10',
          type: 'EMPLOYMENT',
          companyId: 'company-1',
        },
      ],
    } as any)

    const { unmount: unmountDashboard } = render(
      <MemoryRouter initialEntries={['/activities/activity-1']}>
        <Sidebar />
      </MemoryRouter>,
    )

    const activityDashboardLink = screen.getAllByRole('link', { name: /דשבורד/i }).find(
      (link) => link.getAttribute('href') === '/activities/activity-1',
    )
    expect(activityDashboardLink).toBeTruthy()
    expect(activityDashboardLink?.getAttribute('aria-current')).toBe('page')
    unmountDashboard()

    const { unmount: unmountMatrix } = render(
      <MemoryRouter initialEntries={['/activities/activity-1/personnel-status-matrix']}>
        <Sidebar />
      </MemoryRouter>,
    )

    const matrixDashboardLink = screen.getAllByRole('link', { name: /דשבורד/i }).find(
      (link) => link.getAttribute('href') === '/activities/activity-1',
    )
    expect(matrixDashboardLink?.getAttribute('aria-current')).toBeNull()
    expect(screen.getByRole('link', { name: /טבלת נוכחות/i }).getAttribute('aria-current')).toBe('page')
    unmountMatrix()

    const { unmount: unmountTaskList } = render(
      <MemoryRouter initialEntries={['/activities/activity-1/tasks']}>
        <Sidebar />
      </MemoryRouter>,
    )

    const taskListDashboardLink = screen.getAllByRole('link', { name: /דשבורד/i }).find(
      (link) => link.getAttribute('href') === '/activities/activity-1',
    )
    expect(taskListDashboardLink?.getAttribute('aria-current')).toBeNull()
    expect(screen.getByRole('link', { name: /משימות/i }).getAttribute('aria-current')).toBe('page')
    unmountTaskList()

    const { unmount: unmountTaskEdit } = render(
      <MemoryRouter initialEntries={['/activities/activity-1/tasks/task-2/edit']}>
        <Sidebar />
      </MemoryRouter>,
    )

    const editDashboardLink = screen.getAllByRole('link', { name: /דשבורד/i }).find(
      (link) => link.getAttribute('href') === '/activities/activity-1',
    )
    expect(editDashboardLink?.getAttribute('aria-current')).toBeNull()
    expect(screen.getByRole('link', { name: /משימות/i }).getAttribute('aria-current')).toBe('page')
    unmountTaskEdit()
  })

  it('marks the parent navigation item as active for nested company routes', () => {
    render(
      <MemoryRouter initialEntries={['/users/new']}>
        <Sidebar />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: /כוח אדם/i }).getAttribute('aria-current')).toBe('page')
  })
})
