import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'

import { getActivationGoogleLinkStartUrl, postVerifyActivationPhone } from '@/api/activations'
import type { ApiError } from '@/api/client'
import { ErrorState } from '@/shared/components/error-state'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'

type ActivationPageProps = {
  onStartGoogleLinking?: (url: string) => void
}

type ActivationTerminalState = 'invalid' | 'used'

type VerifyPhoneErrorKind = 'invalid-phone' | 'generic'

const defaultStartGoogleLinking = (url: string) => {
  window.location.assign(url)
}

const isApiError = (value: unknown): value is ApiError => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    typeof (value as { status?: unknown }).status === 'number'
  )
}

const toMessage = (value: unknown) => {
  if (!isApiError(value)) {
    return ''
  }

  return value.message.trim().toLowerCase()
}

const resolveTerminalState = (value: unknown): ActivationTerminalState | null => {
  if (!isApiError(value)) {
    return null
  }

  const message = toMessage(value)

  if (value.status === 409 && (message.includes('already activated') || message.includes('already linked'))) {
    return 'used'
  }

  if (value.status === 404) {
    return 'invalid'
  }

  if (value.status === 400 && message.includes('activation is no longer valid')) {
    return 'invalid'
  }

  return null
}

const isInvalidPhoneError = (value: unknown) => {
  if (!isApiError(value)) {
    return false
  }

  return value.status === 400 && toMessage(value).includes('verification failed')
}

export function ActivationPage({ onStartGoogleLinking = defaultStartGoogleLinking }: ActivationPageProps) {
  const { token } = useParams<{ token: string }>()
  const [phone, setPhone] = useState('')
  const [phoneValidationError, setPhoneValidationError] = useState<string | null>(null)
  const [verifyPhoneErrorKind, setVerifyPhoneErrorKind] = useState<VerifyPhoneErrorKind | null>(null)
  const [terminalState, setTerminalState] = useState<ActivationTerminalState | null>(null)
  const [isPhoneVerified, setIsPhoneVerified] = useState(false)
  const [googleLinkingError, setGoogleLinkingError] = useState<string | null>(null)

  const verifyPhoneMutation = useMutation({
    mutationFn: ({ activationToken, submittedPhone }: { activationToken: string; submittedPhone: string }) => {
      return postVerifyActivationPhone(activationToken, submittedPhone)
    },
    onSuccess: () => {
      setPhoneValidationError(null)
      setVerifyPhoneErrorKind(null)
      setTerminalState(null)
      setGoogleLinkingError(null)
      setIsPhoneVerified(true)
    },
    onError: (error) => {
      const nextTerminalState = resolveTerminalState(error)
      if (nextTerminalState) {
        setTerminalState(nextTerminalState)
        setVerifyPhoneErrorKind(null)
        return
      }

      if (isInvalidPhoneError(error)) {
        setVerifyPhoneErrorKind('invalid-phone')
        return
      }

      setVerifyPhoneErrorKind('generic')
    },
  })

  const handleVerifyPhone = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!token) {
      setTerminalState('invalid')
      return
    }

    const trimmedPhone = phone.trim()

    if (trimmedPhone.length === 0) {
      setPhoneValidationError('יש להזין מספר טלפון.')
      return
    }

    setPhoneValidationError(null)
    setVerifyPhoneErrorKind(null)
    setGoogleLinkingError(null)

    verifyPhoneMutation.mutate({
      activationToken: token,
      submittedPhone: trimmedPhone,
    })
  }

  const handleStartGoogleLinking = () => {
    if (!token) {
      setTerminalState('invalid')
      return
    }

    try {
      const authUrl = getActivationGoogleLinkStartUrl(token)
      onStartGoogleLinking(authUrl)
    } catch {
      setGoogleLinkingError('לא הצלחנו להתחיל את החיבור ל-Google. אפשר לנסות שוב.')
    }
  }

  if (terminalState === 'used') {
    return (
      <div className="content-grid flex min-h-svh items-center justify-center px-4 py-8">
        <ErrorState
          title="החשבון כבר הופעל"
          description="נראה שההפעלה כבר הושלמה. אפשר להמשיך להתחברות הרגילה למערכת."
          className="w-full max-w-xl"
        />
      </div>
    )
  }

  if (terminalState === 'invalid') {
    return (
      <div className="content-grid flex min-h-svh items-center justify-center px-4 py-8">
        <ErrorState
          title="הקישור להפעלת החשבון אינו תקף או שפג תוקפו."
          description="יש לבקש קישור הפעלה חדש ממנהל המערכת."
          className="w-full max-w-xl"
        />
      </div>
    )
  }

  return (
    <div className="content-grid flex min-h-svh items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl space-y-4">
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">הפעלת החשבון</CardTitle>
            <CardDescription>הוזמנת להצטרף למערכת.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isPhoneVerified ? (
              <div className="space-y-4">
                <div className="rounded-md border border-success/30 bg-success-soft px-4 py-3 text-sm text-foreground">
                  הטלפון אומת בהצלחה.
                </div>
                <p className="text-sm leading-6 text-muted">חבר את חשבון Google שלך כדי להשלים את ההרשמה.</p>
                <Button type="button" size="lg" className="w-full" onClick={handleStartGoogleLinking}>
                  המשך עם Google
                </Button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleVerifyPhone}>
                <div className="space-y-2">
                  <Label htmlFor="activation-phone">מספר טלפון</Label>
                  <Input
                    id="activation-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="לדוגמה: 054-000-0000"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    disabled={verifyPhoneMutation.isPending}
                  />
                </div>

                {phoneValidationError ? (
                  <p className="text-sm text-danger">{phoneValidationError}</p>
                ) : null}

                {verifyPhoneErrorKind === 'invalid-phone' ? (
                  <p className="text-sm text-danger">לא ניתן לאמת את מספר הטלפון.</p>
                ) : null}

                {verifyPhoneErrorKind === 'generic' ? (
                  <ErrorState
                    title="אירעה שגיאה באימות הטלפון"
                    description="לא הצלחנו להשלים את האימות כרגע. אפשר לנסות שוב."
                  />
                ) : null}

                <Button type="submit" size="lg" className="w-full" loading={verifyPhoneMutation.isPending}>
                  המשך
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {googleLinkingError ? (
          <ErrorState
            title="לא הצלחנו להתחיל חיבור עם Google"
            description={googleLinkingError}
          />
        ) : null}
      </div>
    </div>
  )
}
