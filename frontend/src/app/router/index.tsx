import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom'

import { PermissionRoute, ProtectedRoute, PublicOnlyRoute } from '@/app/auth'
import { MainLayout } from '@/app/layout/main-layout'
import { appRoutes, fallbackRoute } from '@/app/layout/route-config'
import { ActivationPage } from '@/app/pages/activation-page'
import { LoginPage } from '@/app/pages/login-page'
import { PlaceholderRoutePage } from '@/app/pages/placeholder-route-page'
import { DashboardPage } from '@/features/dashboard/pages/dashboard-page'

const placeholderPages = appRoutes.map((route) => ({
  path: route.path,
  element: <PermissionRoute route={route} />,
  children: [
    {
      index: true,
      element: route.key === 'dashboard'
        ? <DashboardPage />
        : <PlaceholderRoutePage title={route.label} description={route.description} />,
    },
  ],
}))

const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/activate/:token',
        element: <ActivationPage />,
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <MainLayout />,
        children: [
          { index: true, element: <Navigate to={fallbackRoute.path} replace /> },
          ...placeholderPages,
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to={fallbackRoute.path} replace />,
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}