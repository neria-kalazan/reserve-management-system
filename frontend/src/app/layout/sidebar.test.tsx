import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/app/auth', () => ({
  PermissionGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import { Sidebar } from '@/app/layout/sidebar'

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders only the implemented company-level navigation items', () => {
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

    expect(screen.queryByRole('link', { name: /שיבוץ/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /פלוגות/i })).toBeNull()
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
