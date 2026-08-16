import {
  Activity,
  BadgeCheck,
  Building2,
  CalendarRange,
  LayoutDashboard,
  Shield,
  Users,
} from 'lucide-react'

export type AppRouteKey = 'dashboard' | 'companies' | 'users' | 'qualifications' | 'units' | 'activities' | 'scheduling'

export interface AppRouteItem {
  key: AppRouteKey
  path: string
  label: string
  description: string
  icon: typeof LayoutDashboard
  requiredPermission?: string
}

export const appRoutes: AppRouteItem[] = [
  {
    key: 'dashboard',
    path: '/dashboard',
    label: 'דשבורד',
    description: 'סקירה תפעולית תתווסף בהמשך',
    icon: LayoutDashboard,
    requiredPermission: 'MANAGE_COMPANIES',
  },
  {
    key: 'companies',
    path: '/companies',
    label: 'פלוגות',
    description: 'ניהול מסגרות יתווסף בהמשך',
    icon: Building2,
    requiredPermission: 'MANAGE_COMPANIES',
  },
  {
    key: 'users',
    path: '/users',
    label: 'משתמשים',
    description: 'ניהול כוח אדם יתווסף בהמשך',
    icon: Users,
    requiredPermission: 'MANAGE_COMPANIES',
  },
  {
    key: 'qualifications',
    path: '/qualifications',
    label: 'הסמכות',
    description: 'ניהול הסמכות יתווסף בהמשך',
    icon: BadgeCheck,
    requiredPermission: 'MANAGE_COMPANIES',
  },
  {
    key: 'units',
    path: '/units',
    label: 'יחידות',
    description: 'ניהול יחידות יתווסף בהמשך',
    icon: Shield,
    requiredPermission: 'MANAGE_COMPANIES',
  },
  {
    key: 'activities',
    path: '/activities',
    label: 'פעילויות',
    description: 'ניהול פעילויות יתווסף בהמשך',
    icon: Activity,
    requiredPermission: 'MANAGE_COMPANIES',
  },
  {
    key: 'scheduling',
    path: '/scheduling',
    label: 'שיבוץ',
    description: 'תשתית השיבוץ תתווסף בהמשך',
    icon: CalendarRange,
    requiredPermission: 'MANAGE_COMPANIES',
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