import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom'

import { PermissionRoute, ProtectedRoute, PublicOnlyRoute } from '@/app/auth'
import { MainLayout } from '@/app/layout/main-layout'
import { appRoutes, fallbackRoute } from '@/app/layout/route-config'
import { ActivationPage } from '@/app/pages/activation-page'
import { LoginPage } from '@/app/pages/login-page'
import { PlaceholderRoutePage } from '@/app/pages/placeholder-route-page'
import { ActivityAvailabilityPage } from '@/features/activities/pages/activity-availability-page'
import { ActivityCreatePage } from '@/features/activities/pages/activity-create-page'
import { ActivityDetailsPage } from '@/features/activities/pages/activity-details-page'
import { ActivityEditPage } from '@/features/activities/pages/activity-edit-page'
import { ActivitiesPage } from '@/features/activities/pages/activities-page'
import { DashboardPage } from '@/features/dashboard/pages/dashboard-page'

const activitiesRoute = appRoutes.find((route) => route.key === 'activities') ?? fallbackRoute

const placeholderPages = appRoutes.map((route) => ({
  path: route.path,
  element: <PermissionRoute route={route} />,
  children: [
    {
      index: true,
      element: route.key === 'dashboard'
        ? <DashboardPage />
        : route.key === 'activities'
          ? <ActivitiesPage />
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
          {
            path: '/activities/new',
            element: <PermissionRoute route={activitiesRoute} />,
            children: [
              {
                index: true,
                element: <ActivityCreatePage />,
              },
            ],
          },
          {
            path: '/activities/:activityId',
            element: <PermissionRoute route={activitiesRoute} />,
            children: [
              {
                index: true,
                element: <ActivityDetailsPage />,
              },
            ],
          },
          {
            path: '/activities/:activityId/availability',
            element: <PermissionRoute route={activitiesRoute} />,
            children: [
              {
                index: true,
                element: <ActivityAvailabilityPage />,
              },
            ],
          },
          {
            path: '/activities/:activityId/edit',
            element: <PermissionRoute route={activitiesRoute} />,
            children: [
              {
                index: true,
                element: <ActivityEditPage />,
              },
            ],
          },
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