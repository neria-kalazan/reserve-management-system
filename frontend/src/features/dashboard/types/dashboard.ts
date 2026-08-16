export interface DashboardActivitySummary {
  id: string
  name: string
  startDate: string
  endDate: string
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
}

export interface DashboardCountItem {
  name: string
  count: number
}

export interface CompanyDashboardResponse {
  companySummary: {
    totalSoldiers: number
    qualificationCounts: DashboardCountItem[]
    roleCounts: DashboardCountItem[]
  }
  upcomingActivities: DashboardActivitySummary[]
  recentActivities: DashboardActivitySummary[]
}