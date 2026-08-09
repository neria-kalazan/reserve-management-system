import { useState } from 'react'

import { getGoogleAuthStartUrl } from '@/api/auth'
import { ErrorState } from '@/shared/components/error-state'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'

type LoginPageProps = {
  onStartGoogleLogin?: (url: string) => void
}

const defaultStartGoogleLogin = (url: string) => {
  window.location.assign(url)
}

export function LoginPage({ onStartGoogleLogin = defaultStartGoogleLogin }: LoginPageProps) {
  const [runtimeError, setRuntimeError] = useState<string | null>(null)

  let authUrl: string | null = null
  let setupError: string | null = null

  try {
    authUrl = getGoogleAuthStartUrl()
  } catch (error) {
    setupError = error instanceof Error ? error.message : 'שגיאה לא צפויה'
  }

  const errorMessage = runtimeError ?? setupError

  const handleGoogleLogin = () => {
    if (!authUrl) {
      return
    }

    try {
      onStartGoogleLogin(authUrl)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'שגיאה לא צפויה'
      setRuntimeError(message)
    }
  }

  return (
    <div className="content-grid flex min-h-svh items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl space-y-4">
        <Card>
          <CardHeader className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-primary">Reserve Management</p>
            <CardTitle className="text-2xl">יש להתחבר כדי להמשיך</CardTitle>
            <CardDescription>
              הכניסה למערכת מתבצעת דרך חשבון Google המאושר בארגון. לאחר ההתחברות תועברו חזרה למערכת.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              type="button"
              size="lg"
              className="w-full"
              disabled={!authUrl}
              onClick={handleGoogleLogin}
            >
              התחברות עם Google
            </Button>
            <p className="text-sm leading-6 text-muted">
              לא נדרשת הזנת סיסמה במערכת זו. האימות מתבצע מול השרת והדפדפן מנהל את session cookie בצורה מאובטחת.
            </p>
          </CardContent>
        </Card>

        {errorMessage ? (
          <ErrorState
            title="לא הצלחנו להתחיל התחברות"
            description={errorMessage}
          />
        ) : null}
      </div>
    </div>
  )
}
