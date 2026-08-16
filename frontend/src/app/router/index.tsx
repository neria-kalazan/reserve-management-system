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
import { ActivityPlanningPage } from '@/features/activities/pages/activity-planning-page'
import { ActivityTaskCreatePage } from '@/features/activities/pages/activity-task-create-page'
import { ActivityTaskInstancesPage } from '@/features/activities/pages/activity-task-instances-page'
import { ActivityTaskRequirementsPage } from '@/features/activities/pages/activity-task-requirements-page'
import { ActivitiesPage } from '@/features/activities/pages/activities-page'
import { DashboardPage } from '@/features/dashboard/pages/dashboard-page'
import { QualificationsPage } from '@/features/qualifications/pages/qualifications-page'
import { RolesPage } from '@/features/roles/pages/roles-page'
import { UnitsPage } from '@/features/units/pages/units-page'
import { UsersPage } from '@/features/users/pages/users-page'

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
          : route.key === 'users'
            ? <UsersPage />
            : route.key === 'roles'
              ? <RolesPage />
              : route.key === 'qualifications'
                ? <QualificationsPage />
                : route.key === 'units'
                  ? <UnitsPage />
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
            path: '/activities/:activityId/planning',
            element: <PermissionRoute route={activitiesRoute} />,
            children: [
              {
                index: true,
                element: <ActivityPlanningPage />,
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
          {
            path: '/activities/:activityId/tasks/new',
            element: <PermissionRoute route={activitiesRoute} />,
            children: [
              {
                index: true,
                element: <ActivityTaskCreatePage />,
              },
            ],
          },
          {
            path: '/activities/:activityId/tasks/:taskId/task-instances',
            element: <PermissionRoute route={activitiesRoute} />,
            children: [
              {
                index: true,
                element: <ActivityTaskInstancesPage />,
              },
            ],
          },
          {
            path: '/activities/:activityId/tasks/:taskId/requirements',
            element: <PermissionRoute route={activitiesRoute} />,
            children: [
              {
                index: true,
                element: <ActivityTaskRequirementsPage />,
              },
            ],
          },
          {
            path: '/users/new',
            element: <PermissionRoute route={appRoutes.find((route) => route.key === 'users') ?? fallbackRoute} />,
            children: [
              {
                index: true,
                element: <PlaceholderRoutePage title="יצירת חייל" description="טופס יצירת חייל יתווסף בהמשך." />,
              },
            ],
          },
          {
            path: '/users/:userId/edit',
            element: <PermissionRoute route={appRoutes.find((route) => route.key === 'users') ?? fallbackRoute} />,
            children: [
              {
                index: true,
                element: <PlaceholderRoutePage title="עריכת חייל" description="טופס עריכת חייל יתווסף בהמשך." />,
              },
            ],
          },
          {
            path: '/roles/new',
            element: <PermissionRoute route={appRoutes.find((route) => route.key === 'roles') ?? fallbackRoute} />,
            children: [
              {
                index: true,
                element: <PlaceholderRoutePage title="יצירת תפקיד" description="טופס יצירת תפקיד יתווסף בהמשך." />,
              },
            ],
          },
          {
            path: '/roles/:roleId/edit',
            element: <PermissionRoute route={appRoutes.find((route) => route.key === 'roles') ?? fallbackRoute} />,
            children: [
              {
                index: true,
                element: <PlaceholderRoutePage title="עריכת תפקיד" description="טופס עריכת תפקיד יתווסף בהמשך." />,
              },
            ],
          },
          {
            path: '/qualifications/new',
            element: <PermissionRoute route={appRoutes.find((route) => route.key === 'qualifications') ?? fallbackRoute} />,
            children: [
              {
                index: true,
                element: <PlaceholderRoutePage title="יצירת הסמכה" description="טופס יצירת הסמכה יתווסף בהמשך." />,
              },
            ],
          },
          {
            path: '/qualifications/:qualificationId/edit',
            element: <PermissionRoute route={appRoutes.find((route) => route.key === 'qualifications') ?? fallbackRoute} />,
            children: [
              {
                index: true,
                element: <PlaceholderRoutePage title="עריכת הסמכה" description="טופס עריכת הסמכה יתווסף בהמשך." />,
              },
            ],
          },
          {
            path: '/units/new',
            element: <PermissionRoute route={appRoutes.find((route) => route.key === 'units') ?? fallbackRoute} />,
            children: [
              {
                index: true,
                element: <PlaceholderRoutePage title="יצירת יחידה" description="טופס יצירת יחידה יתווסף בהמשך." />,
              },
            ],
          },
          {
            path: '/units/:unitId/edit',
            element: <PermissionRoute route={appRoutes.find((route) => route.key === 'units') ?? fallbackRoute} />,
            children: [
              {
                index: true,
                element: <PlaceholderRoutePage title="עריכת יחידה" description="טופס עריכת יחידה יתווסף בהמשך." />,
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