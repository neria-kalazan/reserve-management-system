import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

const {
  postVerifyActivationPhoneMock,
  getActivationGoogleLinkStartUrlMock,
} = vi.hoisted(() => ({
  postVerifyActivationPhoneMock: vi.fn(),
  getActivationGoogleLinkStartUrlMock: vi.fn(),
}))

vi.mock('@/api/activations', () => ({
  postVerifyActivationPhone: postVerifyActivationPhoneMock,
  getActivationGoogleLinkStartUrl: getActivationGoogleLinkStartUrlMock,
}))

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

const renderActivationPage = () => {
  render(
    <MemoryRouter initialEntries={['/activate/token-123']}>
      <Routes>
        <Route path="/activate/:token" element={<ActivationPage />} />
      </Routes>
    </MemoryRouter>,
    { wrapper: createWrapper() },
  )
}

describe('ActivationPage', () => {
  it('renders initial activation state with phone input and continue button', () => {
    renderActivationPage()

    expect(screen.getByText('הפעלת החשבון')).toBeDefined()
    expect(screen.getByText('הוזמנת להצטרף למערכת.')).toBeDefined()
    expect(screen.getByLabelText('מספר טלפון')).toBeDefined()
    expect(screen.getByRole('button', { name: 'המשך' })).toBeDefined()
  })

  it('calls verify phone endpoint with route token and submitted phone', async () => {
    postVerifyActivationPhoneMock.mockResolvedValueOnce({ verified: true, activationId: 'activation-1' })

    renderActivationPage()

    fireEvent.change(screen.getByLabelText('מספר טלפון'), {
      target: { value: '0547724987' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'המשך' }))

    await waitFor(() => {
      expect(postVerifyActivationPhoneMock).toHaveBeenCalledWith('token-123', '0547724987')
    })
  })

  it('disables interaction while phone verification is in progress', async () => {
    postVerifyActivationPhoneMock.mockImplementationOnce(
      () => new Promise(() => {
        // keep mutation pending
      }),
    )

    renderActivationPage()

    const phoneInput = screen.getByLabelText('מספר טלפון') as HTMLInputElement
    const submitButton = screen.getByRole('button', { name: 'המשך' }) as HTMLButtonElement

    fireEvent.change(phoneInput, {
      target: { value: '0547724987' },
    })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(phoneInput.disabled).toBe(true)
      expect(submitButton.disabled).toBe(true)
    })
  })

  it('transitions to Google linking state after successful phone verification', async () => {
    postVerifyActivationPhoneMock.mockResolvedValueOnce({ verified: true, activationId: 'activation-1' })

    renderActivationPage()

    fireEvent.change(screen.getByLabelText('מספר טלפון'), {
      target: { value: '0547724987' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'המשך' }))

    await waitFor(() => {
      expect(screen.getByText('הטלפון אומת בהצלחה.')).toBeDefined()
      expect(screen.getByRole('button', { name: 'המשך עם Google' })).toBeDefined()
    })
  })

  it('does not render OTP UI in MVP mode', () => {
    renderActivationPage()

    expect(screen.queryByText('OTP')).toBeNull()
  })

  it('shows generic invalid phone message when verification fails', async () => {
    postVerifyActivationPhoneMock.mockRejectedValueOnce({ status: 400, message: 'Verification failed' })

    renderActivationPage()

    fireEvent.change(screen.getByLabelText('מספר טלפון'), {
      target: { value: '0000000' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'המשך' }))

    await waitFor(() => {
      expect(screen.getByText('לא ניתן לאמת את מספר הטלפון.')).toBeDefined()
    })
  })

  it('shows invalid/expired token state when activation token is invalid', async () => {
    postVerifyActivationPhoneMock.mockRejectedValueOnce({ status: 400, message: 'Activation is no longer valid' })

    renderActivationPage()

    fireEvent.change(screen.getByLabelText('מספר טלפון'), {
      target: { value: '0547724987' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'המשך' }))

    await waitFor(() => {
      expect(screen.getByText('הקישור להפעלת החשבון אינו תקף או שפג תוקפו.')).toBeDefined()
    })
  })

  it('shows already used/completed activation state on activation conflict', async () => {
    postVerifyActivationPhoneMock.mockRejectedValueOnce({ status: 409, message: 'User is already activated' })

    renderActivationPage()

    fireEvent.change(screen.getByLabelText('מספר טלפון'), {
      target: { value: '0547724987' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'המשך' }))

    await waitFor(() => {
      expect(screen.getByText('החשבון כבר הופעל')).toBeDefined()
    })
  })

  it('starts activation-aware Google linking using backend endpoint URL', async () => {
    postVerifyActivationPhoneMock.mockResolvedValueOnce({ verified: true, activationId: 'activation-1' })
    getActivationGoogleLinkStartUrlMock.mockReturnValueOnce('http://127.0.0.1:3000/activations/token-123/link-google')
    const onStartGoogleLinking = vi.fn()

    render(
      <MemoryRouter initialEntries={['/activate/token-123']}>
        <Routes>
          <Route path="/activate/:token" element={<ActivationPage onStartGoogleLinking={onStartGoogleLinking} />} />
        </Routes>
      </MemoryRouter>,
      { wrapper: createWrapper() },
    )

    fireEvent.change(screen.getByLabelText('מספר טלפון'), {
      target: { value: '0547724987' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'המשך' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'המשך עם Google' })).toBeDefined()
    })

    fireEvent.click(screen.getByRole('button', { name: 'המשך עם Google' }))

    expect(getActivationGoogleLinkStartUrlMock).toHaveBeenCalledWith('token-123')
    expect(onStartGoogleLinking).toHaveBeenCalledWith('http://127.0.0.1:3000/activations/token-123/link-google')
  })

  it('shows generic Google linking failure without resetting verified state', async () => {
    postVerifyActivationPhoneMock.mockResolvedValueOnce({ verified: true, activationId: 'activation-1' })
    getActivationGoogleLinkStartUrlMock.mockReturnValueOnce('http://127.0.0.1:3000/activations/token-123/link-google')

    render(
      <MemoryRouter initialEntries={['/activate/token-123']}>
        <Routes>
          <Route
            path="/activate/:token"
            element={<ActivationPage onStartGoogleLinking={() => { throw new Error('failed') }} />}
          />
        </Routes>
      </MemoryRouter>,
      { wrapper: createWrapper() },
    )

    fireEvent.change(screen.getByLabelText('מספר טלפון'), {
      target: { value: '0547724987' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'המשך' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'המשך עם Google' })).toBeDefined()
    })

    fireEvent.click(screen.getByRole('button', { name: 'המשך עם Google' }))

    expect(screen.getByText('לא הצלחנו להתחיל חיבור עם Google')).toBeDefined()
    expect(screen.getByText('הטלפון אומת בהצלחה.')).toBeDefined()
  })
})
