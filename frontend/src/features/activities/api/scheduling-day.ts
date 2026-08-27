import { api } from '@/api/client'
import type {
  CandidateSeverity,
  TaskValidationResult,
} from '@/features/activities/api/activity-tasks'
import type {
  ActivityStatus,
  AvailabilityStatus,
  DailyStatus,
} from '@/features/activities/types/activity'

export interface SchedulingDayActivity {
  id: string
  companyId: string
  name: string
  status: ActivityStatus
  startDate: string
  endDate: string
}

export interface SchedulingDayTaskDefinitionRef {
  id: string
  name: string
  description: string | null
}

export interface SchedulingDayManpowerRequirement {
  required: boolean
  quantity: number
}

export interface SchedulingDayRoleRequirement {
  roleId: string
  roleName?: string
  required: boolean
  quantity: number
}

export interface SchedulingDayQualificationRequirement {
  qualificationId: string
  qualificationName?: string
  required: boolean
  quantity: number
}

export interface SchedulingDayTaskRequirements {
  manpower: SchedulingDayManpowerRequirement | null
  roles: SchedulingDayRoleRequirement[]
  qualifications: SchedulingDayQualificationRequirement[]
}

export interface SchedulingDayAssignmentSlots {
  total: number
  filled: number
  unfilled: number
}

export interface SchedulingDayAssignedUser {
  id: string
  firstName: string
  lastName: string
  personalNumber: string
  phone: string | null
  email: string | null
  isActive: boolean
  unit: {
    id: string
    name: string
  } | null
}

export interface SchedulingDayAvailabilitySnapshot {
  status: DailyStatus
  availability: AvailabilityStatus
}

export interface SchedulingDayCandidateEvaluation {
  userId: string
  severity: CandidateSeverity
  reasonCodes: string[]
  reasonMessages: string[]
}

export interface SchedulingDayAssignment {
  id: string
  taskInstanceId: string
  userId: string
  createdBy: string | null
  createdAt: string
  updatedAt: string
  user: SchedulingDayAssignedUser
  availability?: SchedulingDayAvailabilitySnapshot
  evaluation: SchedulingDayCandidateEvaluation
}

export interface SchedulingDayTaskInstance {
  id: string
  activityTaskId: string
  activityTask: SchedulingDayTaskDefinitionRef
  title: string
  startTime: string
  endTime: string
  isOvernight: boolean
  requirements: SchedulingDayTaskRequirements
  assignmentSlots: SchedulingDayAssignmentSlots
  assignments: SchedulingDayAssignment[]
  validation: TaskValidationResult
}

export interface SchedulingDayResponse {
  activity: SchedulingDayActivity
  date: string
  isDayOpened: boolean
  taskInstances: SchedulingDayTaskInstance[]
}

export const getActivitySchedulingDay = (activityId: string, date: string) =>
  api.get<SchedulingDayResponse>(
    `/activities/${encodeURIComponent(activityId)}/scheduling/day?date=${encodeURIComponent(date)}`,
  )
