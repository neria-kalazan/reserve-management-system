import { describe, expect, it, vi } from 'vitest'

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }))

vi.mock('@/api/client', () => ({
  api: { get: getMock },
}))

import { getCompanyDashboard } from '@/features/dashboard/api/dashboard'

describe('getCompanyDashboard', () => {
  it('requests the dashboard for the authoritative company id', async () => {
    const response = {
      activeActivity: null,
      manpowerSummary: {
        totalActiveUsers: 0,
        usersParticipatingInActivity: 0,
        todayAvailabilitySummary: { statusCounts: {} },
      },
      tasksSummary: {
        totalTaskInstances: 0,
        unassignedTaskInstances: 0,
        validationIssuesSummary: { requiredErrorCount: 0, warningCount: 0 },
      },
      validationIssues: {
        requiredErrorCount: 0,
        warningCount: 0,
        issues: [],
      },
    }
    getMock.mockResolvedValueOnce(response)

    await expect(getCompanyDashboard('company-1')).resolves.toEqual(response)
    expect(getMock).toHaveBeenCalledWith('/companies/company-1/dashboard')
  })
})