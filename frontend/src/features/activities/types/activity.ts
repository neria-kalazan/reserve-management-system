export type ActivityStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'

export interface Activity {
  id: string
  companyId: string
  name: string
  startDate: string
  endDate: string
  status: ActivityStatus
  createdAt: string
  updatedAt: string
}

export interface CreateActivityInput {
  name: string
  startDate: string
  endDate: string
  status?: ActivityStatus
}

export interface UpdateActivityInput {
  name?: string
  startDate?: string
  endDate?: string
  status?: ActivityStatus
}
