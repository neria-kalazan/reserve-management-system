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

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    )

    expect(screen.getByText('פעילות')).toBeTruthy()

    const dashboardLinks = screen.getAllByRole('link', { name: 'דשבורד' })
    expect(dashboardLinks.map((link) => link.getAttribute('href'))).toContain('/activities/activity-1')
    expect(dashboardLinks.map((link) => link.getAttribute('href'))).toContain('/dashboard')

    expect(screen.getByRole('link', { name: 'מבצע אבירים' }).getAttribute('href')).toBe('/activities/activity-1')
    expect(screen.getByRole('link', { name: 'טבלת נוכחות' }).getAttribute('href')).toBe('/activities/activity-1/personnel-status-matrix')
    expect(screen.getByRole('link', { name: 'טבלת שיבוץ' }).getAttribute('href')).toBe('/activities/activity-1/planning')
    expect(screen.getByRole('link', { name: 'משימות' }).getAttribute('href')).toBe('/activities/activity-1/tasks/new')
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
