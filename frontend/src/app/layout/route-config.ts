import {
  Activity,
  Building2,
  CalendarRange,
  LayoutDashboard,
  Users,
} from 'lucide-react'

export type AppRouteKey = 'dashboard' | 'companies' | 'users' | 'activities' | 'scheduling'

export interface AppRouteItem {
  key: AppRouteKey
  path: string
  label: string
  description: string
  icon: typeof LayoutDashboard
}

export const appRoutes: AppRouteItem[] = [
  {
    key: 'dashboard',
    path: '/dashboard',
    label: 'דשבורד',
    description: 'סקירה תפעולית תתווסף בהמשך',
    icon: LayoutDashboard,
  },
  {
    key: 'companies',
    path: '/companies',
    label: 'פלוגות',
    description: 'ניהול מסגרות יתווסף בהמשך',
    icon: Building2,
  },
  {
    key: 'users',
    path: '/users',
    label: 'משתמשים',
    description: 'ניהול כוח אדם יתווסף בהמשך',
    icon: Users,
  },
  {
    key: 'activities',
    path: '/activities',
    label: 'פעילויות',
    description: 'ניהול פעילויות יתווסף בהמשך',
    icon: Activity,
  },
  {
    key: 'scheduling',
    path: '/scheduling',
    label: 'שיבוץ',
    description: 'תשתית השיבוץ תתווסף בהמשך',
    icon: CalendarRange,
  },
]

export const fallbackRoute: AppRouteItem = appRoutes[0] ?? {
  key: 'dashboard',
  path: '/dashboard',
  label: 'דשבורד',
  description: 'סקירה תפעולית תתווסף בהמשך',
  icon: LayoutDashboard,
}

export const routeMap = new Map(appRoutes.map((item) => [item.path, item]))