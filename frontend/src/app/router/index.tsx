import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom'

import { ProtectedRoute, PublicOnlyRoute } from '@/app/auth'
import { MainLayout } from '@/app/layout/main-layout'
import { appRoutes, fallbackRoute } from '@/app/layout/route-config'
import { LoginPage } from '@/app/pages/login-page'
import { PlaceholderRoutePage } from '@/app/pages/placeholder-route-page'

const placeholderPages = appRoutes.map((route) => ({
  path: route.path,
  element: <PlaceholderRoutePage title={route.label} description={route.description} />,
}))

const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
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