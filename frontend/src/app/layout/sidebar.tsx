import { NavLink } from 'react-router-dom'

import { appRoutes } from '@/app/layout/route-config'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { cn } from '@/shared/utils/cn'

type SidebarProps = {
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps) {
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

            return (
              <NavLink
                key={route.path}
                to={route.path}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group flex items-start gap-3 rounded-md border border-transparent px-3 py-3 text-right transition-colors',
                    'hover:border-border-strong hover:bg-surface-elevated',
                    isActive && 'border-primary/40 bg-primary-soft text-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted transition-colors',
                        isActive && 'border-primary/50 bg-primary text-primary-foreground',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{route.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-muted">{route.description}</span>
                    </span>
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>
      </ScrollArea>
    </aside>
  )
}