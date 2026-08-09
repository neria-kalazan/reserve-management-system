import { useNavigate } from 'react-router-dom'

import { fallbackRoute } from '@/app/layout/route-config'
import { ErrorState } from '@/shared/components/error-state'
import { Button } from '@/shared/components/ui/button'

type ForbiddenPageProps = {
  message?: string
  onReset?: () => void
}

export function ForbiddenPage({ message, onReset }: ForbiddenPageProps) {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <ErrorState
        title="אין הרשאה לביצוע הפעולה"
        description={message ?? 'החשבון מחובר, אך אין הרשאה לגשת למסך או לבצע את הפעולה המבוקשת.'}
        className="w-full max-w-xl"
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                onReset?.()
                navigate(fallbackRoute.path)
              }}
            >
              חזרה למסך הראשי
            </Button>
            <Button
              type="button"
              onClick={() => {
                onReset?.()
              }}
            >
              ניסיון חוזר
            </Button>
          </div>
        }
      />
    </div>
  )
}
