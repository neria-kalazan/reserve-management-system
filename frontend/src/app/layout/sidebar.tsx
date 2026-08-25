import { NavLink } from 'react-router-dom'

import { PermissionGate } from '@/app/auth'
import { appRoutes } from '@/app/layout/route-config'
import { useCompanyActivities } from '@/features/activities/queries/use-activities'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { cn } from '@/shared/utils/cn'

type SidebarProps = {
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const activitiesQuery = useCompanyActivities()
  const activeActivity = activitiesQuery.data?.find((activity) => activity.status === 'ACTIVE') ?? null

  return (
    <aside className="flex h-full w-full flex-col bg-surface px-3 py-4 md:border-l md:border-border">
      <div className="px-3 pb-4">
        <div className="rounded-lg border border-border bg-surface-elevated px-4 py-4 shadow-panel">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-primary">Reserve Management</p>
          <h2 className="mt-2 text-lg font-semibold text-foreground">מערכת ניהול מערך המילואים</h2>
          <p className="mt-1 text-sm leading-6 text-muted">תשתית חזותית ותפעולית אחידה לכל מסכי המערכת.</p>
        </div>
      </div>

      <ScrollArea className="flex-1 px-2">
        <nav className="space-y-1">
          {appRoutes.map((route) => {
            const Icon = route.icon
            const navEntry = (
              <NavLink
                key={route.path}
                to={route.path}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-md border border-transparent px-3 py-3 text-right transition-colors',
                    'hover:border-border-strong hover:bg-surface-elevated',
                    isActive && 'border-primary/40 bg-primary-soft text-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted transition-colors',
                        isActive && 'border-primary/50 bg-primary text-primary-foreground',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 self-center text-sm font-medium">{route.label}</span>
                  </>
                )}
              </NavLink>
            )

            if (!route.requiredPermission) {
              return navEntry
            }

            return (
              <PermissionGate key={route.path} permission={route.requiredPermission}>
                {navEntry}
              </PermissionGate>
            )
          })}

          {activeActivity ? (
            <div className="mt-2 space-y-1 rounded-md border border-border bg-surface-elevated p-2">
              <p className="px-2 pt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-muted">פעילות</p>

              <NavLink
                to={`/activities/${activeActivity.id}`}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-md border border-transparent px-3 py-2 text-right text-sm font-medium transition-colors',
                    'hover:border-border-strong hover:bg-surface',
                    isActive && 'border-primary/40 bg-primary-soft text-foreground',
                  )
                }
              >
                דשבורד
              </NavLink>

              <NavLink
                to={`/activities/${activeActivity.id}`}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-md border border-transparent px-3 py-2 text-right text-sm font-medium transition-colors',
                    'hover:border-border-strong hover:bg-surface',
                    isActive && 'border-primary/40 bg-primary-soft text-foreground',
                  )
                }
              >
                {activeActivity.name}
              </NavLink>

              <NavLink
                to={`/activities/${activeActivity.id}/personnel-status-matrix`}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-md border border-transparent px-3 py-2 text-right text-sm font-medium transition-colors',
                    'hover:border-border-strong hover:bg-surface',
                    isActive && 'border-primary/40 bg-primary-soft text-foreground',
                  )
                }
              >
                טבלת נוכחות
              </NavLink>

              <NavLink
                to={`/activities/${activeActivity.id}/planning`}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-md border border-transparent px-3 py-2 text-right text-sm font-medium transition-colors',
                    'hover:border-border-strong hover:bg-surface',
                    isActive && 'border-primary/40 bg-primary-soft text-foreground',
                  )
                }
              >
                טבלת שיבוץ
              </NavLink>

              <NavLink
                to={`/activities/${activeActivity.id}/tasks/new`}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-md border border-transparent px-3 py-2 text-right text-sm font-medium transition-colors',
                    'hover:border-border-strong hover:bg-surface',
                    isActive && 'border-primary/40 bg-primary-soft text-foreground',
                  )
                }
              >
                משימות
              </NavLink>
            </div>
          ) : null}
        </nav>
      </ScrollArea>
    </aside>
  )
}