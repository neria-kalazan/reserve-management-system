import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

const { useAuthSessionMock } = vi.hoisted(() => ({
  useAuthSessionMock: vi.fn(),
}))

vi.mock('@/app/auth/use-auth-session', () => ({
  useAuthSession: useAuthSessionMock,
}))

import { PublicOnlyRoute } from '@/app/auth/auth-route-gates'
import { ActivationPage } from '@/app/pages/activation-page'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('Activation route gate integration', () => {
  it('renders activation page on /activate/:token as a public route', () => {
    useAuthSessionMock.mockReturnValueOnce({
      isInitializing: false,
      isAuthenticated: false,
      error: null,
      refetch: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/activate/token-123']}>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/activate/:token" element={<ActivationPage />} />
            <Route path="/login" element={<div>login-screen</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
      { wrapper: createWrapper() },
    )

    expect(screen.getByText('הפעלת החשבון')).toBeDefined()
    expect(screen.getByRole('button', { name: 'המשך' })).toBeDefined()
    expect(screen.queryByText('login-screen')).toBeNull()
  })
})
