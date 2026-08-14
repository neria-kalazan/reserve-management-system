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

export interface CompanyRole {
  id: string
  name: string
  description?: string | null
  createdAt?: string
}

export interface CompanyQualification {
  id: string
  name: string
  description?: string | null
  createdAt?: string
}

export const getActivityTasks = (activityId: string) =>
  api.get<ActivityTask[]>(`/activities/${encodeURIComponent(activityId)}/tasks`)

export const postActivityTask = (activityId: string, body: CreateActivityTaskInput) =>
  api.post<ActivityTask>(`/activities/${encodeURIComponent(activityId)}/tasks`, body)

export const getCompanyRoles = (companyId: string) =>
  api.get<CompanyRole[]>(`/companies/${encodeURIComponent(companyId)}/roles`)

export const getCompanyQualifications = (companyId: string) =>
  api.get<CompanyQualification[]>(`/companies/${encodeURIComponent(companyId)}/qualifications`)

export const getActivityTaskRequirements = (activityTaskId: string) =>
  api.get<ActivityTaskRequirements>(`/activity-tasks/${encodeURIComponent(activityTaskId)}/requirements`)

export const updateActivityTaskRequirements = (
  activityTaskId: string,
  body: UpdateActivityTaskRequirementsInput,
) =>
  api.put<ActivityTaskRequirements>(`/activity-tasks/${encodeURIComponent(activityTaskId)}/requirements`, body)

export const getActivityTaskInstances = (activityTaskId: string) =>
  api.get<ActivityTaskInstance[]>(`/activity-tasks/${encodeURIComponent(activityTaskId)}/task-instances`)

export const getTaskInstanceValidation = (taskInstanceId: string) =>
  api.get<TaskValidationResult>(`/task-instances/${encodeURIComponent(taskInstanceId)}/validation`)

export const createActivityTaskInstance = (activityTaskId: string, body: CreateActivityTaskInstanceInput) =>
  api.post<ActivityTaskInstance>(`/activity-tasks/${encodeURIComponent(activityTaskId)}/task-instances`, body)

export const updateActivityTaskInstance = (taskInstanceId: string, body: UpdateActivityTaskInstanceInput) =>
  api.patch<ActivityTaskInstance>(`/task-instances/${encodeURIComponent(taskInstanceId)}`, body)

export const deleteActivityTaskInstance = (taskInstanceId: string) =>
  api.delete<ActivityTaskInstance>(`/task-instances/${encodeURIComponent(taskInstanceId)}`)
