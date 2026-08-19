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

export interface DashboardRoleHolder {
  roleId: string
  roleName: string
  holderId: string
  holderFirstName: string
  holderLastName: string
  unitId: string
  unitName: string
  unitDisplayOrder: number
}

export interface CompanyDashboardResponse {
  companySummary: {
    totalSoldiers: number
    qualificationCounts: DashboardCountItem[]
    roleCounts: DashboardCountItem[]
  }
  roleHolders: DashboardRoleHolder[]
  upcomingActivities: DashboardActivitySummary[]
  recentActivities: DashboardActivitySummary[]
}