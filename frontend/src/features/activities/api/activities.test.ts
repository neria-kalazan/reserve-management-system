import { describe, expect, it, vi } from 'vitest'

const { getMock, postMock, patchMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  patchMock: vi.fn(),
}))

vi.mock('@/api/client', () => ({
  api: {
    get: getMock,
    post: postMock,
    patch: patchMock,
  },
}))

import {
  bulkUpdateActivityAvailability,
  generateActivityAvailability,
  getActivityAvailability,
  getActivityById,
  getActivityOverview,
  getCompanyActivities,
  patchActivity,
  postCompanyActivity,
} from '@/features/activities/api/activities'

describe('activities api', () => {
  it('requests activity list by company id', async () => {
    const response = [{ id: 'activity-1', name: 'Ops' }]
    getMock.mockResolvedValueOnce(response)

    await expect(getCompanyActivities('company-1')).resolves.toEqual(response)
    expect(getMock).toHaveBeenCalledWith('/companies/company-1/activities')
  })

  it('requests activity details by activity id', async () => {
    const response = { id: 'activity-1', name: 'Ops' }
    getMock.mockResolvedValueOnce(response)

    await expect(getActivityById('activity-1')).resolves.toEqual(response)
    expect(getMock).toHaveBeenCalledWith('/activities/activity-1')
  })

  it('requests activity overview by activity id', async () => {
    const response = { activity: { id: 'activity-1' }, manpowerSummary: { participantCount: 2 } }
    getMock.mockResolvedValueOnce(response)

    await expect(getActivityOverview('activity-1')).resolves.toEqual(response)
    expect(getMock).toHaveBeenCalledWith('/activities/activity-1/overview')
  })

  it('requests activity availability by activity id', async () => {
    const response = [{ id: 'status-1', activityId: 'activity-1', userId: 'user-1', status: 'ACTIVE', availability: 'ALL_DAY' }]
    getMock.mockResolvedValueOnce(response)

    await expect(getActivityAvailability('activity-1')).resolves.toEqual(response)
    expect(getMock).toHaveBeenCalledWith('/activities/activity-1/availability')
  })

  it('generates activity availability by activity id', async () => {
    const response = [{ id: 'status-1', activityId: 'activity-1', userId: 'user-1', status: 'ACTIVE', availability: 'ALL_DAY' }]
    postMock.mockResolvedValueOnce(response)

    await expect(generateActivityAvailability('activity-1')).resolves.toEqual(response)
    expect(postMock).toHaveBeenCalledWith('/activities/activity-1/availability/generate')
  })

  it('bulk updates activity availability by activity id', async () => {
    const body = {
      userIds: ['user-1', 'user-2'],
      startDate: '2026-08-13',
      endDate: '2026-08-15',
      availability: 'MORNING' as const,
    }
    const response = { updatedCount: 2, updatedRecords: [{ id: 'status-1', availability: 'MORNING' }] }
    patchMock.mockResolvedValueOnce(response)

    await expect(bulkUpdateActivityAvailability('activity-1', body)).resolves.toEqual(response)
    expect(patchMock).toHaveBeenCalledWith('/activities/activity-1/availability/bulk', body)
  })

  it('creates activity under company scope', async () => {
    const body = {
      name: 'Reserve Drill',
      startDate: '2026-08-13',
      endDate: '2026-08-15',
    }
    const response = { id: 'activity-2', ...body, status: 'DRAFT' }
    postMock.mockResolvedValueOnce(response)

    await expect(postCompanyActivity('company-1', body)).resolves.toEqual(response)
    expect(postMock).toHaveBeenCalledWith('/companies/company-1/activities', body)
  })

  it('updates activity by activity id', async () => {
    const body = { status: 'ACTIVE' as const }
    const response = { id: 'activity-1', status: 'ACTIVE' }
    patchMock.mockResolvedValueOnce(response)

    await expect(patchActivity('activity-1', body)).resolves.toEqual(response)
    expect(patchMock).toHaveBeenCalledWith('/activities/activity-1', body)
  })
})
