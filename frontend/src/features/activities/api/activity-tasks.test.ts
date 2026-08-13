import { describe, expect, it, vi } from 'vitest'

vi.mock('@/api/client', () => ({
  api: {
    get: vi.fn(),
  },
}))

import { api } from '@/api/client'
import { getActivityTasks } from '@/features/activities/api/activity-tasks'

const apiGetMock = vi.mocked(api.get)

describe('activity task API', () => {
  it('calls the activity-scoped activity tasks endpoint', async () => {
    apiGetMock.mockResolvedValueOnce([{ id: 'task-1', name: 'הכנה', description: 'תיאור' }])

    const result = await getActivityTasks('activity-1')

    expect(apiGetMock).toHaveBeenCalledWith('/activities/activity-1/tasks')
    expect(result).toEqual([{ id: 'task-1', name: 'הכנה', description: 'תיאור' }])
  })
})
