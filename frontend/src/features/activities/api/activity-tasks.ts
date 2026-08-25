import { api } from '@/api/client'

export interface ActivityTask {
  id: string
  activityId: string
  name: string
  description: string | null
  createdAt?: string
  updatedAt?: string
}

export interface CreateActivityTaskInput {
  name: string
  description?: string
}

export type UpdateActivityTaskInput = Partial<CreateActivityTaskInput>

export interface ActivityTaskManpowerRequirement {
  required: boolean
  quantity: number
}

export interface ActivityTaskRoleRequirement {
  roleId: string
  required: boolean
  quantity: number
}

export interface ActivityTaskQualificationRequirement {
  qualificationId: string
  required: boolean
  quantity: number
}

export interface ActivityTaskRequirements {
  manpower: ActivityTaskManpowerRequirement | null
  roles: ActivityTaskRoleRequirement[]
  qualifications: ActivityTaskQualificationRequirement[]
}

export type UpdateActivityTaskRequirementsInput = {
  manpower?: ActivityTaskManpowerRequirement
  roles?: ActivityTaskRoleRequirement[]
  qualifications?: ActivityTaskQualificationRequirement[]
}

export interface ActivityTaskInstance {
  id: string
  activityTaskId: string
  title: string
  startTime: string
  endTime: string
  createdAt?: string
  updatedAt?: string
}

export type ValidationIssueType = 'MANPOWER' | 'ROLE' | 'QUALIFICATION' | 'AVAILABILITY'

export interface TaskValidationIssue {
  type: ValidationIssueType
  message: string
}

export interface TaskValidationSummary {
  isValid: boolean
}

export interface TaskValidationResult {
  requiredErrors: TaskValidationIssue[]
  warnings: TaskValidationIssue[]
  summary: TaskValidationSummary
}

export interface CreateActivityTaskInstanceInput {
  title: string
  startTime: string
  endTime: string
}

export type UpdateActivityTaskInstanceInput = Partial<CreateActivityTaskInstanceInput>

export interface CompanyQualification {
  id: string
  name: string
  description?: string | null
  createdAt?: string
}

export interface AvailableUser {
  id: string
  firstName: string
  lastName: string
  phone: string | null
  email: string | null
  personalNumber: string
  isActive: boolean
}

export interface CompanyUser extends AvailableUser {
  unit: {
    id: string
    name: string
    description: string | null
    displayOrder: number
  } | null
}

export type CandidateSeverity = 'NORMAL' | 'WARNING' | 'CRITICAL'

export interface CandidateEvaluation {
  userId: string
  severity: CandidateSeverity
  reasonCodes: string[]
  reasonMessages: string[]
}

export interface AssignmentUser {
  id: string
  firstName: string
  lastName: string
  phone: string | null
  email: string | null
  personalNumber: string
  isActive: boolean
}

export interface Assignment {
  id: string
  taskInstanceId: string
  userId: string
  createdBy: string | null
  createdAt: string
  updatedAt: string
  user: AssignmentUser
}

export interface CreateAssignmentInput {
  userId: string
  createdBy?: string
}

export interface CreateAssignmentResponse {
  assignment: Assignment
  validation: TaskValidationResult
}

export interface TaskInstanceWorkspaceAssignment {
  assignmentId: string
  userId: string
  user: {
    id: string
    firstName: string
    lastName: string
  }
}

export interface TaskInstanceWorkspaceRequirements {
  manpower: {
    required: boolean
    quantity: number
  }
  roleRequirements: Array<{
    roleId: string
    required: boolean
    quantity: number
  }>
  qualificationRequirements: Array<{
    qualificationId: string
    required: boolean
    quantity: number
  }>
}

export interface TaskInstanceWorkspace {
  taskInstance: {
    id: string
    title: string
    startTime: string
    endTime: string
    activityTask: {
      id: string
      name: string
      activity: {
        id: string
      }
    }
  }
  requirements: TaskInstanceWorkspaceRequirements
  currentAssignments: TaskInstanceWorkspaceAssignment[]
  candidates: AvailableUser[]
  validation: TaskValidationResult
}

export const getActivityTasks = (activityId: string) =>
  api.get<ActivityTask[]>(`/activities/${encodeURIComponent(activityId)}/tasks`)

export const postActivityTask = (activityId: string, body: CreateActivityTaskInput) =>
  api.post<ActivityTask>(`/activities/${encodeURIComponent(activityId)}/tasks`, body)

export const getActivityTaskById = (activityTaskId: string) =>
  api.get<ActivityTask>(`/activity-tasks/${encodeURIComponent(activityTaskId)}`)

export const updateActivityTask = (activityTaskId: string, body: UpdateActivityTaskInput) =>
  api.patch<ActivityTask>(`/activity-tasks/${encodeURIComponent(activityTaskId)}`, body)

export const getCompanyRoles = (companyId: string) =>
  api.get<CompanyRole[]>(`/companies/${encodeURIComponent(companyId)}/roles`)

export const getCompanyQualifications = (companyId: string) =>
  api.get<CompanyQualification[]>(`/companies/${encodeURIComponent(companyId)}/qualifications`)

export const getCompanyUsers = (companyId: string) =>
  api.get<CompanyUser[]>(`/companies/${encodeURIComponent(companyId)}/users`)

export const getActivityTaskRequirements = (activityTaskId: string) =>
  api.get<ActivityTaskRequirements>(`/activity-tasks/${encodeURIComponent(activityTaskId)}/requirements`)

export const updateActivityTaskRequirements = (
  activityTaskId: string,
  body: UpdateActivityTaskRequirementsInput,
) =>
  api.put<ActivityTaskRequirements>(`/activity-tasks/${encodeURIComponent(activityTaskId)}/requirements`, body)

export const getActivityTaskInstances = (activityTaskId: string) =>
  api.get<ActivityTaskInstance[]>(`/activity-tasks/${encodeURIComponent(activityTaskId)}/task-instances`)

export const getTaskInstanceWorkspace = (taskInstanceId: string) =>
  api.get<TaskInstanceWorkspace>(`/task-instances/${encodeURIComponent(taskInstanceId)}/workspace`)

export const getAvailableUsers = (taskInstanceId: string) =>
  api.get<AvailableUser[]>(`/task-instances/${encodeURIComponent(taskInstanceId)}/available-users`)

export const getTaskInstanceValidation = (taskInstanceId: string) =>
  api.get<TaskValidationResult>(`/task-instances/${encodeURIComponent(taskInstanceId)}/validation`)

export const getCandidateEvaluation = (taskInstanceId: string, userId: string) =>
  api.get<CandidateEvaluation>(`/task-instances/${encodeURIComponent(taskInstanceId)}/candidates/${encodeURIComponent(userId)}/evaluation`)

export const getTaskInstanceAssignments = (taskInstanceId: string) =>
  api.get<Assignment[]>(`/task-instances/${encodeURIComponent(taskInstanceId)}/assignments`)

export const createTaskInstanceAssignment = (taskInstanceId: string, body: CreateAssignmentInput) =>
  api.post<CreateAssignmentResponse>(`/task-instances/${encodeURIComponent(taskInstanceId)}/assignments`, body)

export const deleteAssignment = (assignmentId: string) =>
  api.delete<Assignment>(`/assignments/${encodeURIComponent(assignmentId)}`)

export const createActivityTaskInstance = (activityTaskId: string, body: CreateActivityTaskInstanceInput) =>
  api.post<ActivityTaskInstance>(`/activity-tasks/${encodeURIComponent(activityTaskId)}/task-instances`, body)

export const updateActivityTaskInstance = (taskInstanceId: string, body: UpdateActivityTaskInstanceInput) =>
  api.patch<ActivityTaskInstance>(`/task-instances/${encodeURIComponent(taskInstanceId)}`, body)

export const deleteActivityTaskInstance = (taskInstanceId: string) =>
  api.delete<ActivityTaskInstance>(`/task-instances/${encodeURIComponent(taskInstanceId)}`)
