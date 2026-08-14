import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuthSession } from '@/app/auth/use-auth-session'
import {
  createActivityTaskInstance,
  createTaskInstanceAssignment,
  deleteActivityTaskInstance,
  deleteAssignment,
  getActivityTaskInstances,
  getActivityTaskRequirements,
  getActivityTasks,
  getAvailableUsers,
  getCandidateEvaluation,
  getCompanyQualifications,
  getCompanyRoles,
  getCompanyUsers,
  getTaskInstanceAssignments,
  getTaskInstanceValidation,
  getTaskInstanceWorkspace,
  postActivityTask,
  updateActivityTaskInstance,
  updateActivityTaskRequirements,
} from '@/features/activities/api/activity-tasks'
import type {
  ActivityTask,
  ActivityTaskInstance,
  ActivityTaskRequirements,
  Assignment,
  AvailableUser,
  CandidateEvaluation,
  CompanyQualification,
  CompanyRole,
  CompanyUser,
  CreateActivityTaskInput,
  CreateActivityTaskInstanceInput,
  CreateAssignmentInput,
  TaskInstanceWorkspace,
  TaskValidationResult,
  UpdateActivityTaskInstanceInput,
  UpdateActivityTaskRequirementsInput,
} from '@/features/activities/api/activity-tasks'

export const activityTasksQueryKey = (activityId: string | undefined) =>
  ['activities', activityId, 'tasks'] as const

export const activityTaskRequirementsQueryKey = (activityTaskId: string | undefined) =>
  ['activity-tasks', activityTaskId, 'requirements'] as const

export const activityTaskInstancesQueryKey = (activityTaskId: string | undefined) =>
  ['activity-tasks', activityTaskId, 'task-instances'] as const

export const taskInstanceWorkspaceQueryKey = (taskInstanceId: string | undefined) =>
  ['task-instances', taskInstanceId, 'workspace'] as const

export const availableUsersQueryKey = (taskInstanceId: string | undefined) =>
  ['task-instances', taskInstanceId, 'available-users'] as const

export const companyUsersQueryKey = (companyId: string | undefined) =>
  ['companies', companyId, 'users'] as const

export const candidateEvaluationQueryKey = (taskInstanceId: string | undefined, userId: string | undefined) =>
  ['task-instances', taskInstanceId, 'candidate-evaluation', userId] as const

export const taskInstanceAssignmentsQueryKey = (taskInstanceId: string | undefined) =>
  ['task-instances', taskInstanceId, 'assignments'] as const

export const taskInstanceValidationQueryKey = (taskInstanceId: string | undefined) =>
  ['task-instances', taskInstanceId, 'validation'] as const

export function useActivityTasks(activityId: string | undefined) {
  const { isAuthenticated } = useAuthSession()

  return useQuery<ActivityTask[]>({
    queryKey: activityTasksQueryKey(activityId),
    queryFn: () => getActivityTasks(activityId as string),
    enabled: isAuthenticated && typeof activityId === 'string' && activityId.length > 0,
  })
}

export function useActivityTaskRequirements(activityTaskId: string | undefined) {
  const { isAuthenticated } = useAuthSession()

  return useQuery<ActivityTaskRequirements>({
    queryKey: activityTaskRequirementsQueryKey(activityTaskId),
    queryFn: () => getActivityTaskRequirements(activityTaskId as string),
    enabled: isAuthenticated && typeof activityTaskId === 'string' && activityTaskId.length > 0,
  })
}

export function useCompanyRoles(companyId: string | undefined) {
  const { isAuthenticated } = useAuthSession()

  return useQuery<CompanyRole[]>({
    queryKey: ['companies', companyId, 'roles'],
    queryFn: () => getCompanyRoles(companyId as string),
    enabled: isAuthenticated && typeof companyId === 'string' && companyId.length > 0,
  })
}

export function useCompanyQualifications(companyId: string | undefined) {
  const { isAuthenticated } = useAuthSession()

  return useQuery<CompanyQualification[]>({
    queryKey: ['companies', companyId, 'qualifications'],
    queryFn: () => getCompanyQualifications(companyId as string),
    enabled: isAuthenticated && typeof companyId === 'string' && companyId.length > 0,
  })
}

export function useCompanyUsers(companyId: string | undefined) {
  const { isAuthenticated } = useAuthSession()

  return useQuery<CompanyUser[]>({
    queryKey: companyUsersQueryKey(companyId),
    queryFn: () => getCompanyUsers(companyId as string),
    enabled: isAuthenticated && typeof companyId === 'string' && companyId.length > 0,
  })
}

export function useCreateActivityTask(activityId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: CreateActivityTaskInput) => {
      if (typeof activityId !== 'string' || activityId.length === 0) {
        throw new Error('Cannot create a task without a valid activity id.')
      }

      return postActivityTask(activityId, body)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: activityTasksQueryKey(activityId) })
    },
  })
}

export function useUpdateActivityTaskRequirements(activityTaskId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: UpdateActivityTaskRequirementsInput) => {
      if (typeof activityTaskId !== 'string' || activityTaskId.length === 0) {
        throw new Error('Cannot update task requirements without a valid activity task id.')
      }

      return updateActivityTaskRequirements(activityTaskId, body)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: activityTaskRequirementsQueryKey(activityTaskId) })
      await queryClient.invalidateQueries({ queryKey: ['task-instances'] })
    },
  })
}

export function useActivityTaskInstances(activityTaskId: string | undefined) {
  const { isAuthenticated } = useAuthSession()

  return useQuery<ActivityTaskInstance[]>({
    queryKey: activityTaskInstancesQueryKey(activityTaskId),
    queryFn: () => getActivityTaskInstances(activityTaskId as string),
    enabled: isAuthenticated && typeof activityTaskId === 'string' && activityTaskId.length > 0,
  })
}

export function useTaskInstanceWorkspace(taskInstanceId: string | undefined) {
  const { isAuthenticated } = useAuthSession()

  return useQuery<TaskInstanceWorkspace>({
    queryKey: taskInstanceWorkspaceQueryKey(taskInstanceId),
    queryFn: () => getTaskInstanceWorkspace(taskInstanceId as string),
    enabled: isAuthenticated && typeof taskInstanceId === 'string' && taskInstanceId.length > 0,
  })
}

export function useAvailableUsers(taskInstanceId: string | undefined) {
  const { isAuthenticated } = useAuthSession()

  return useQuery<AvailableUser[]>({
    queryKey: availableUsersQueryKey(taskInstanceId),
    queryFn: () => getAvailableUsers(taskInstanceId as string),
    enabled: isAuthenticated && typeof taskInstanceId === 'string' && taskInstanceId.length > 0,
  })
}

export function useTaskInstanceValidation(taskInstanceId: string | undefined) {
  const { isAuthenticated } = useAuthSession()

  return useQuery<TaskValidationResult>({
    queryKey: taskInstanceValidationQueryKey(taskInstanceId),
    queryFn: () => getTaskInstanceValidation(taskInstanceId as string),
    enabled: isAuthenticated && typeof taskInstanceId === 'string' && taskInstanceId.length > 0,
  })
}

export function useCandidateEvaluation(taskInstanceId: string | undefined, userId: string | undefined) {
  const { isAuthenticated } = useAuthSession()

  return useQuery<CandidateEvaluation>({
    queryKey: candidateEvaluationQueryKey(taskInstanceId, userId),
    queryFn: () => getCandidateEvaluation(taskInstanceId as string, userId as string),
    enabled:
      isAuthenticated &&
      typeof taskInstanceId === 'string' &&
      taskInstanceId.length > 0 &&
      typeof userId === 'string' &&
      userId.length > 0,
  })
}

export function useTaskInstanceAssignments(taskInstanceId: string | undefined) {
  const { isAuthenticated } = useAuthSession()

  return useQuery<Assignment[]>({
    queryKey: taskInstanceAssignmentsQueryKey(taskInstanceId),
    queryFn: () => getTaskInstanceAssignments(taskInstanceId as string),
    enabled: isAuthenticated && typeof taskInstanceId === 'string' && taskInstanceId.length > 0,
  })
}

export function useCreateActivityTaskInstance(activityTaskId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: CreateActivityTaskInstanceInput) => {
      if (typeof activityTaskId !== 'string' || activityTaskId.length === 0) {
        throw new Error('Cannot create a task instance without a valid activity task id.')
      }

      return createActivityTaskInstance(activityTaskId, body)
    },
    onSuccess: async (createdTaskInstance) => {
      await queryClient.invalidateQueries({ queryKey: activityTaskInstancesQueryKey(activityTaskId) })
      await queryClient.invalidateQueries({ queryKey: taskInstanceValidationQueryKey(createdTaskInstance.id) })
    },
  })
}

export interface UpdateActivityTaskInstanceMutationInput {
  taskInstanceId: string
  body: UpdateActivityTaskInstanceInput
}

export function useUpdateActivityTaskInstance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskInstanceId, body }: UpdateActivityTaskInstanceMutationInput) =>
      updateActivityTaskInstance(taskInstanceId, body),
    onSuccess: async (updatedTaskInstance) => {
      await queryClient.invalidateQueries({
        queryKey: activityTaskInstancesQueryKey(updatedTaskInstance.activityTaskId),
      })
      await queryClient.invalidateQueries({
        queryKey: taskInstanceValidationQueryKey(updatedTaskInstance.id),
      })
    },
  })
}

export function useDeleteActivityTaskInstance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (taskInstanceId: string) => deleteActivityTaskInstance(taskInstanceId),
    onSuccess: async (deletedTaskInstance) => {
      await queryClient.invalidateQueries({
        queryKey: activityTaskInstancesQueryKey(deletedTaskInstance.activityTaskId),
      })
      await queryClient.invalidateQueries({
        queryKey: taskInstanceValidationQueryKey(deletedTaskInstance.id),
      })
    },
  })
}

export function useCreateTaskInstanceAssignment(taskInstanceId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: CreateAssignmentInput) => {
      if (typeof taskInstanceId !== 'string' || taskInstanceId.length === 0) {
        throw new Error('Cannot create an assignment without a valid task instance id.')
      }

      return createTaskInstanceAssignment(taskInstanceId, body)
    },
    onSuccess: async () => {
      if (typeof taskInstanceId !== 'string' || taskInstanceId.length === 0) {
        return
      }

      await queryClient.invalidateQueries({ queryKey: taskInstanceAssignmentsQueryKey(taskInstanceId) })
      await queryClient.invalidateQueries({ queryKey: taskInstanceValidationQueryKey(taskInstanceId) })
      await queryClient.invalidateQueries({ queryKey: taskInstanceWorkspaceQueryKey(taskInstanceId) })
      await queryClient.invalidateQueries({ queryKey: availableUsersQueryKey(taskInstanceId) })
    },
  })
}

export function useDeleteAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (assignmentId: string) => deleteAssignment(assignmentId),
    onSuccess: async (deletedAssignment) => {
      const taskInstanceId = deletedAssignment.taskInstanceId

      await queryClient.invalidateQueries({ queryKey: taskInstanceAssignmentsQueryKey(taskInstanceId) })
      await queryClient.invalidateQueries({ queryKey: taskInstanceValidationQueryKey(taskInstanceId) })
      await queryClient.invalidateQueries({ queryKey: taskInstanceWorkspaceQueryKey(taskInstanceId) })
      await queryClient.invalidateQueries({ queryKey: availableUsersQueryKey(taskInstanceId) })
    },
  })
}
