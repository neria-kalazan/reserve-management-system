import { describe, expect, it, vi } from 'vitest'

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }))

vi.mock('@/api/client', () => ({
  api: { get: getMock },
}))

import { getCompanyDashboard } from '@/features/dashboard/api/dashboard'

describe('getCompanyDashboard', () => {
  it('requests the dashboard for the authoritative company id', async () => {
    const response = {
      companySummary: {
        totalSoldiers: 0,
        qualificationCounts: [],
        roleCounts: [],
      },
      roleHolders: [],
      upcomingActivities: [],
      recentActivities: [],
    }
    getMock.mockResolvedValueOnce(response)

    await expect(getCompanyDashboard('company-1')).resolves.toEqual(response)
    expect(getMock).toHaveBeenCalledWith('/companies/company-1/dashboard')
  })
})