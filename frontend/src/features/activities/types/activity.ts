export type ActivityStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
export type ActivityType = 'TRAINING' | 'EMPLOYMENT' | 'TRAINING_COURSE'
export type DailyStatus = 'ACTIVE' | 'HOLIDAY' | 'SICK' | 'RELEASED'
export type AvailabilityStatus = 'MORNING' | 'EVENING' | 'ALL_DAY' | 'UNAVAILABLE'

export interface Activity {
  id: string
  companyId: string
  name: string
  type: ActivityType
  startDate: string
  endDate: string
  status: ActivityStatus
  createdAt: string
  updatedAt: string
}

export interface ActivityOverviewTaskInstance {
  id: string
  title: string
}

export interface ActivityOverviewTaskAssignmentSummary {
  totalTaskInstances: number
  assignedTaskInstances: number
  unassignedTaskInstances: number
  totalAssignments: number
}

export interface ActivityOverviewValidationSummary {
  requiredErrorCount: number
  warningCount: number
}

export interface ActivityOverviewTask {
  taskId: string
  taskName: string
  taskInstances?: ActivityOverviewTaskInstance[]
  assignedUsersCount?: number
  assignmentSummary?: ActivityOverviewTaskAssignmentSummary
  validationSummary?: ActivityOverviewValidationSummary
}

export interface ActivityOverviewCompany {
  id: string
  name?: string
  status?: ActivityStatus
}

export interface ActivityOverviewActivity {
  id: string
  name: string
  startDate?: string
  endDate?: string
  status: ActivityStatus
  company?: ActivityOverviewCompany
}

export interface ActivityOverviewManpowerSummary {
  participantCount: number
  dailyStatusSummary?: Partial<Record<DailyStatus | string, number>>
}

export interface ActivityOverviewAvailabilitySummary {
  byAvailability?: Partial<Record<AvailabilityStatus | string, number>>
}

export interface ActivityOverview {
  activity: ActivityOverviewActivity
  manpowerSummary: ActivityOverviewManpowerSummary
  tasksOverview?: ActivityOverviewTask[]
  availabilitySummary?: ActivityOverviewAvailabilitySummary
  averageHolidayDaysPerSoldier?: number
  administrativeActiveDays?: number
}

export interface ActivityAvailabilityUser {
  id: string
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  email?: string | null
  personalNumber?: string | null
  isActive?: boolean
}

export interface ActivityAvailabilityRecord {
  id: string
  activityId: string
  userId: string
  date: string
  status: DailyStatus
  availability: AvailabilityStatus
  createdAt?: string
  updatedAt?: string
  user?: ActivityAvailabilityUser
}

export interface BulkActivityAvailabilityUpdateInput {
  userIds: string[]
  startDate: string
  endDate: string
  availability: AvailabilityStatus
}

export interface BulkActivityAvailabilityUpdateResponse {
  updatedCount: number
  updatedRecords: Array<Pick<ActivityAvailabilityRecord, 'id' | 'availability' | 'userId' | 'date'>>
}

export interface CreateActivityInput {
  name: string
  type: ActivityType
  startDate: string
  endDate: string
  status?: ActivityStatus
}

export interface UpdateActivityInput {
  name?: string
  type?: ActivityType
  startDate?: string
  endDate?: string
  status?: ActivityStatus
}
