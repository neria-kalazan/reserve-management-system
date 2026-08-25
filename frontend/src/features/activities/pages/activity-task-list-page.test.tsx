import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/activities/queries/use-activities', () => ({
  useActivityById: vi.fn(),
}))

vi.mock('@/features/activities/queries/use-activity-tasks', () => ({
  useActivityTasks: vi.fn(),
  useCompanyRoles: vi.fn(),
  useCompanyQualifications: vi.fn(),
  activityTaskRequirementsQueryKey: vi.fn(),
  getActivityTaskRequirements: vi.fn(),
}))

import { useActivityById } from '@/features/activities/queries/use-activities'
import { useActivityTasks, useCompanyQualifications, useCompanyRoles } from '@/features/activities/queries/use-activity-tasks'
import { ActivityTaskListPage } from '@/features/activities/pages/activity-task-list-page'

const useActivityByIdMock = vi.mocked(useActivityById)
const useActivityTasksMock = vi.mocked(useActivityTasks)
const useCompanyRolesMock = vi.mocked(useCompanyRoles)
const useCompanyQualificationsMock = vi.mocked(useCompanyQualifications)

describe('ActivityTaskListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useActivityByIdMock.mockReturnValue({
      data: { id: 'activity-1', name: 'מבצע אבירים', companyId: 'company-1' },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    } as any)
    useActivityTasksMock.mockReturnValue({
      data: [
        { id: 'task-1', activityId: 'activity-1', name: 'הכנה', description: 'תיאור משימה' },
        { id: 'task-2', activityId: 'activity-1', name: 'הפעלה', description: null },
      ],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any)
    useCompanyRolesMock.mockReturnValue({
      data: [{ id: 'role-1', name: 'מפקד', description: null }],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    } as any)
    useCompanyQualificationsMock.mockReturnValue({
      data: [{ id: 'qual-1', name: 'רישיון נהיגה', description: null }],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    } as any)
  })

  it('renders the activity task definitions page and task names without showing task instances', () => {
    const queryClient = new QueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/activities/activity-1/tasks']}>
          <Routes>
            <Route path="/activities/:activityId/tasks" element={<ActivityTaskListPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByText('משימות פעילות')).toBeTruthy()
    expect(screen.getByText('הכנה')).toBeTruthy()
    expect(screen.getByText('הפעלה')).toBeTruthy()
    expect(screen.queryByText('מופעים')).toBeNull()
    expect(screen.queryByText('דרישות')).toBeNull()
    expect(screen.queryByText('שיבוצים')).toBeNull()
  })
})
