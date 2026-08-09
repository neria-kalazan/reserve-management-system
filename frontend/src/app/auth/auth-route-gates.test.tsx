import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

const { useAuthSessionMock } = vi.hoisted(() => ({
  useAuthSessionMock: vi.fn(),
}))

vi.mock('@/app/auth/use-auth-session', () => ({
  useAuthSession: useAuthSessionMock,
}))

import { ProtectedRoute } from '@/app/auth/auth-route-gates'

describe('ProtectedRoute', () => {
  it('does not redirect during initialization', () => {
    useAuthSessionMock.mockReturnValueOnce({
      isInitializing: true,
      isAuthenticated: false,
      error: null,
      refetch: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>protected-content</div>} />
          </Route>
          <Route path="/login" element={<div>login-screen</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('בודק התחברות')).toBeDefined()
  })

  it('allows authenticated user to access protected route', () => {
    useAuthSessionMock.mockReturnValueOnce({
      isInitializing: false,
      isAuthenticated: true,
      error: null,
      refetch: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>protected-content</div>} />
          </Route>
          <Route path="/login" element={<div>login-screen</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('protected-content')).toBeDefined()
  })

  it('redirects unauthenticated user to login', () => {
    useAuthSessionMock.mockReturnValueOnce({
      isInitializing: false,
      isAuthenticated: false,
      error: null,
      refetch: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>protected-content</div>} />
          </Route>
          <Route path="/login" element={<div>login-screen</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('login-screen')).toBeDefined()
  })
})
