import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom'

import { MainLayout } from '@/app/layout/main-layout'
import { appRoutes, fallbackRoute } from '@/app/layout/route-config'
import { PlaceholderRoutePage } from '@/app/pages/placeholder-route-page'

const placeholderPages = appRoutes.map((route) => ({
  path: route.path,
  element: <PlaceholderRoutePage title={route.label} description={route.description} />,
}))

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Navigate to={fallbackRoute.path} replace /> },
      ...placeholderPages,
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