import { describe, expect, it, vi } from 'vitest'

vi.mock('@/api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

import { api } from '@/api/client'
import {
  createTaskInstanceAssignment,
  deleteAssignment,
  getActivityTasks,
} from '@/features/activities/api/activity-tasks'

const apiGetMock = vi.mocked(api.get)
const apiPostMock = vi.mocked(api.post)
const apiDeleteMock = vi.mocked(api.delete)

describe('activity task API', () => {
  it('calls the activity-scoped activity tasks endpoint', async () => {
    apiGetMock.mockResolvedValueOnce([{ id: 'task-1', name: 'הכנה', description: 'תיאור' }])

    const result = await getActivityTasks('activity-1')

    expect(apiGetMock).toHaveBeenCalledWith('/activities/activity-1/tasks')
    expect(result).toEqual([{ id: 'task-1', name: 'הכנה', description: 'תיאור' }])
  })

  it('creates an assignment via the existing task-instance assignments endpoint', async () => {
    const response = {
      assignment: {
        id: 'assignment-1',
        taskInstanceId: 'instance-1',
        userId: 'user-1',
        createdBy: null,
        createdAt: '2026-08-20T09:00:00.000Z',
        updatedAt: '2026-08-20T09:00:00.000Z',
        user: {
          id: 'user-1',
          firstName: 'Dana',
          lastName: 'Levi',
          phone: null,
          email: null,
          personalNumber: '1234',
          isActive: true,
        },
      },
      validation: {
        requiredErrors: [],
        warnings: [],
        summary: { isValid: true },
      },
    }
    apiPostMock.mockResolvedValueOnce(response)

    const result = await createTaskInstanceAssignment('instance-1', { userId: 'user-1' })

    expect(apiPostMock).toHaveBeenCalledWith('/task-instances/instance-1/assignments', { userId: 'user-1' })
    expect(result).toEqual(response)
  })

  it('deletes an assignment via the existing assignments endpoint', async () => {
    const response = {
      id: 'assignment-1',
      taskInstanceId: 'instance-1',
      userId: 'user-1',
      createdBy: null,
      createdAt: '2026-08-20T09:00:00.000Z',
      updatedAt: '2026-08-20T09:00:00.000Z',
      user: {
        id: 'user-1',
        firstName: 'Dana',
        lastName: 'Levi',
        phone: null,
        email: null,
        personalNumber: '1234',
        isActive: true,
      },
    }
    apiDeleteMock.mockResolvedValueOnce(response)

    const result = await deleteAssignment('assignment-1')

    expect(apiDeleteMock).toHaveBeenCalledWith('/assignments/assignment-1')
    expect(result).toEqual(response)
  })
})
