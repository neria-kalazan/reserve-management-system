import { Outlet } from 'react-router-dom'

import { Sidebar } from '@/app/layout/sidebar'
import { TopBar } from '@/app/layout/top-bar'
import { Dialog, DialogContent, DialogTitle } from '@/shared/components/ui/dialog'
import { useShellStore } from '@/shared/hooks/use-shell-store'

export function MainLayout() {
  const isMobileNavOpen = useShellStore((state) => state.isMobileNavOpen)
  const setMobileNavOpen = useShellStore((state) => state.setMobileNavOpen)

  return (
    <div className="min-h-svh bg-background text-foreground">
      <TopBar onOpenMobileNav={() => setMobileNavOpen(true)} />

      <div className="content-grid grid min-h-[calc(100svh-4rem)] grid-cols-1 md:grid-cols-[19rem_1fr]">
        <div className="hidden min-h-full md:block">
          <Sidebar />
        </div>

        <main className="min-w-0 border-t border-transparent md:border-l md:border-border">
          <Outlet />
        </main>
      </div>

      <Dialog open={isMobileNavOpen} onOpenChange={setMobileNavOpen}>
        <DialogContent className="mr-0 ml-auto h-svh w-[min(21rem,88vw)] rounded-none border-r-0 border-l border-border p-0 sm:max-w-none">
          <DialogTitle className="sr-only">ניווט ראשי</DialogTitle>
          <Sidebar onNavigate={() => setMobileNavOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}