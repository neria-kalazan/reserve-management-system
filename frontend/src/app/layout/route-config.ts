import {
  BadgeCheck,
  CalendarDays,
  LayoutDashboard,
  Shield,
  Users,
} from 'lucide-react'

export type AppRouteKey = 'dashboard' | 'activities' | 'users' | 'roles' | 'qualifications' | 'units'

export interface AppRouteItem {
  key: AppRouteKey
  path: string
  label: string
  icon: typeof LayoutDashboard
  requiredPermission?: string
}

export const appRoutes: AppRouteItem[] = [
  {
    key: 'dashboard',
    path: '/dashboard',
    label: 'דשבורד',
    icon: LayoutDashboard,
    requiredPermission: 'MANAGE_COMPANIES',
  },
  {
    key: 'activities',
    path: '/activities',
    label: 'פעילויות',
    icon: CalendarDays,
    requiredPermission: 'MANAGE_COMPANIES',
  },
  {
    key: 'users',
    path: '/users',
    label: 'כוח אדם',
    icon: Users,
    requiredPermission: 'MANAGE_COMPANIES',
  },
  {
    key: 'roles',
    path: '/roles',
    label: 'תפקידים',
    icon: Shield,
    requiredPermission: 'MANAGE_COMPANIES',
  },
  {
    key: 'qualifications',
    path: '/qualifications',
    label: 'הסמכות',
    icon: BadgeCheck,
    requiredPermission: 'MANAGE_COMPANIES',
  },
  {
    key: 'units',
    path: '/units',
    label: 'מסגרות',
    icon: Shield,
    requiredPermission: 'MANAGE_COMPANIES',
  },
]

export const fallbackRoute: AppRouteItem = appRoutes[0] ?? {
  key: 'dashboard',
  path: '/dashboard',
  label: 'דשבורד',
  icon: LayoutDashboard,
}

export const routeMap = new Map(appRoutes.map((item) => [item.path, item]))