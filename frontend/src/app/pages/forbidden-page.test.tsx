import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

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

import { ForbiddenPage } from '@/app/pages/forbidden-page'

describe('ForbiddenPage', () => {
  it('renders forbidden message in Hebrew', () => {
    render(
      <MemoryRouter>
        <ForbiddenPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('אין הרשאה לביצוע הפעולה')).toBeDefined()
    expect(screen.getByText('חזרה למסך הראשי')).toBeDefined()
  })

  it('runs reset callback and navigates to dashboard entry', () => {
    const onReset = vi.fn()

    render(
      <MemoryRouter>
        <ForbiddenPage onReset={onReset} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'חזרה למסך הראשי' }))

    expect(onReset).toHaveBeenCalledTimes(1)
    expect(navigateMock).toHaveBeenCalled()
  })
})
