import { describe, expect, it, vi } from 'vitest'

vi.mock('@/api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

import { api } from '@/api/client'
import {
  getActivitySchedulingDay,
  openActivitySchedulingDay,
  type OpenSchedulingDayResponse,
  type SchedulingDayResponse,
} from '@/features/activities/api/scheduling-day'

const apiGetMock = vi.mocked(api.get)
const apiPostMock = vi.mocked(api.post)

describe('scheduling day API', () => {
  it('constructs the expected scheduling day endpoint with a date query parameter', async () => {
    apiGetMock.mockResolvedValueOnce({
      activity: {
        id: 'activity-1',
        companyId: 'company-1',
        name: 'Daily Ops',
        status: 'ACTIVE',
        startDate: '2026-08-10T00:00:00.000Z',
        endDate: '2026-08-20T00:00:00.000Z',
      },
      date: '2026-08-15',
      isDayOpened: false,
      taskInstances: [],
    } satisfies SchedulingDayResponse)

    await getActivitySchedulingDay('activity-1', '2026-08-15')

    expect(apiGetMock).toHaveBeenCalledWith('/activities/activity-1/scheduling/day?date=2026-08-15')
  })

  it('returns the typed scheduling day response payload', async () => {
    const payload: SchedulingDayResponse = {
      activity: {
        id: 'activity-1',
        companyId: 'company-1',
        name: 'Daily Ops',
        status: 'ACTIVE',
        startDate: '2026-08-10T00:00:00.000Z',
        endDate: '2026-08-20T00:00:00.000Z',
      },
      date: '2026-08-15',
      isDayOpened: true,
      taskInstances: [
        {
          id: 'instance-1',
          activityTaskId: 'task-1',
          activityTask: {
            id: 'task-1',
            name: 'Setup',
            description: null,
          },
          title: 'Morning Shift',
          startTime: '2026-08-15T08:00:00.000Z',
          endTime: '2026-08-15T16:00:00.000Z',
          isOvernight: false,
          requirements: {
            manpower: { required: true, quantity: 2 },
            roles: [{ roleId: 'role-1', roleName: 'Medic', required: true, quantity: 1 }],
            qualifications: [
              {
                qualificationId: 'qual-1',
                qualificationName: 'CPR',
                required: false,
                quantity: 1,
              },
            ],
          },
          assignmentSlots: {
            total: 2,
            filled: 1,
            unfilled: 1,
          },
          assignments: [
            {
              id: 'assignment-1',
              taskInstanceId: 'instance-1',
              userId: 'user-1',
              createdBy: null,
              createdAt: '2026-08-15T07:00:00.000Z',
              updatedAt: '2026-08-15T07:00:00.000Z',
              user: {
                id: 'user-1',
                firstName: 'Ada',
                lastName: 'Lovelace',
                personalNumber: '123',
                phone: null,
                email: 'ada@example.com',
                isActive: true,
                unit: { id: 'unit-1', name: 'A' },
              },
              availability: {
                status: 'ACTIVE',
                availability: 'ALL_DAY',
              },
              evaluation: {
                userId: 'user-1',
                severity: 'NORMAL',
                reasonCodes: [],
                reasonMessages: [],
                reasons: [],
              },
            },
          ],
          validation: {
            requiredErrors: [],
            warnings: [],
            summary: { isValid: true },
          },
        },
      ],
    }

    apiGetMock.mockResolvedValueOnce(payload)

    const result = await getActivitySchedulingDay('activity-1', '2026-08-15')

    expect(result).toEqual(payload)
  })

  it('calls the open scheduling-day endpoint with selected date payload', async () => {
    const payload: OpenSchedulingDayResponse = {
      activityId: 'activity-1',
      date: '2026-08-15',
      isDayOpened: true,
    }

    apiPostMock.mockResolvedValueOnce(payload)

    await openActivitySchedulingDay('activity-1', { date: '2026-08-15' })

    expect(apiPostMock).toHaveBeenCalledWith('/activities/activity-1/scheduling/day/open', {
      date: '2026-08-15',
    })
  })
})
