import { Menu } from 'lucide-react'
import { useLocation } from 'react-router-dom'

import { useAuthLogout, useAuthSession } from '@/app/auth'
import { routeMap } from '@/app/layout/route-config'
import { Button } from '@/shared/components/ui/button'
import { Separator } from '@/shared/components/ui/separator'

type TopBarProps = {
  onOpenMobileNav: () => void
}

export function TopBar({ onOpenMobileNav }: TopBarProps) {
  const location = useLocation()
  const route = routeMap.get(location.pathname)
  const authSession = useAuthSession()
  const logoutMutation = useAuthLogout()

  const userDisplayName = authSession.user
    ? `${authSession.user.firstName} ${authSession.user.lastName}`.trim()
    : null

  return (
    <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="content-grid flex min-h-16 items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onOpenMobileNav}
            aria-label="פתיחת תפריט ניווט"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="space-y-0.5">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted">EPIC 8 Foundation</p>
            <h1 className="text-sm font-semibold text-foreground md:text-base">{route?.label ?? 'מערכת ניהול מילואים'}</h1>
          </div>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {logoutMutation.error ? (
            <span className="text-sm text-danger">לא הצלחנו להתנתק. נסו שוב.</span>
          ) : (
            <>
              <span className="text-sm text-muted">תשתית עיצוב ותשתית טכנית</span>
              <Separator orientation="vertical" className="h-6" />
              <span className="text-sm font-medium text-foreground">RTL · Dark · Teal</span>
            </>
          )}

          <Separator orientation="vertical" className="h-6" />
          <span className="text-sm text-muted">{userDisplayName ?? 'משתמש מחובר'}</span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={logoutMutation.isPending}
            onClick={() => logoutMutation.mutate()}
          >
            התנתקות
          </Button>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="md:hidden"
          loading={logoutMutation.isPending}
          onClick={() => logoutMutation.mutate()}
        >
          יציאה
        </Button>
      </div>
    </div>
  )
}