export interface DashboardActiveActivity {
  id: string
  name: string
  startDate: string
  endDate: string
  numberOfDays: number
}

export interface DashboardValidationIssue {
  type: string
  message: string
}

export interface DashboardValidationSummary {
  requiredErrorCount: number
  warningCount: number
}

export interface CompanyDashboardResponse {
  activeActivity: DashboardActiveActivity | null
  manpowerSummary: {
    totalActiveUsers: number
    usersParticipatingInActivity: number
    todayAvailabilitySummary: {
      statusCounts: Record<string, number>
    }
  }
  tasksSummary: {
    totalTaskInstances: number
    unassignedTaskInstances: number
    validationIssuesSummary: DashboardValidationSummary
  }
  validationIssues: DashboardValidationSummary & {
    issues: DashboardValidationIssue[]
  }
}