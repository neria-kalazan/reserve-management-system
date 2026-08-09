import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getGoogleAuthStartUrlMock } = vi.hoisted(() => ({
  getGoogleAuthStartUrlMock: vi.fn(),
}))

vi.mock('@/api/auth', () => ({
  getGoogleAuthStartUrl: getGoogleAuthStartUrlMock,
}))

import { LoginPage } from '@/app/pages/login-page'

describe('LoginPage', () => {
  beforeEach(() => {
    getGoogleAuthStartUrlMock.mockReset()
    getGoogleAuthStartUrlMock.mockReturnValue('http://127.0.0.1:3000/auth/google')
  })

  it('renders login screen content', () => {
    render(<LoginPage />)

    expect(screen.getByText('יש להתחבר כדי להמשיך')).toBeDefined()
    expect(screen.getByText('התחברות עם Google')).toBeDefined()
  })

  it('starts backend Google auth flow via backend auth URL', () => {
    const onStartGoogleLogin = vi.fn()

    render(<LoginPage onStartGoogleLogin={onStartGoogleLogin} />)

    const loginButton = screen.getByRole('button', { name: 'התחברות עם Google' })
    loginButton.click()

    expect(getGoogleAuthStartUrlMock).toHaveBeenCalledTimes(1)
    expect(onStartGoogleLogin).toHaveBeenCalledWith('http://127.0.0.1:3000/auth/google')
  })
})
