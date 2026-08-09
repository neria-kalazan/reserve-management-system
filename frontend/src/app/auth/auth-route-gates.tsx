import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuthSession } from '@/app/auth/use-auth-session'
import { ErrorState } from '@/shared/components/error-state'
import { LoadingState } from '@/shared/components/loading-state'
import { Button } from '@/shared/components/ui/button'

function AuthGateLoading() {
  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <LoadingState
        title="בודק התחברות"
        description="המערכת מאמתת את מצב ההתחברות שלך."
        className="w-full max-w-xl"
      />
    </div>
  )
}

function AuthGateError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <ErrorState
        title="אירעה שגיאה בבדיקת ההתחברות"
        description="לא הצלחנו לבדוק את מצב ההתחברות. אפשר לנסות שוב."
        action={
          <Button type="button" variant="secondary" onClick={onRetry}>
            ניסיון חוזר
          </Button>
        }
        className="w-full max-w-xl"
      />
    </div>
  )
}

export function ProtectedRoute() {
  const location = useLocation()
  const authSession = useAuthSession()

  if (authSession.isInitializing) {
    return <AuthGateLoading />
  }

  if (authSession.error) {
    return <AuthGateError onRetry={() => void authSession.refetch()} />
  }

  if (!authSession.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

export function PublicOnlyRoute() {
  const authSession = useAuthSession()

  if (authSession.isInitializing) {
    return <AuthGateLoading />
  }

  if (authSession.error) {
    return <AuthGateError onRetry={() => void authSession.refetch()} />
  }

  if (authSession.isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
