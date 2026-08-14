import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuthSession } from '@/app/auth/use-auth-session'
import {
  createActivityTaskInstance,
  deleteActivityTaskInstance,
  getActivityTaskInstances,
  getActivityTaskRequirements,
  getActivityTasks,
  getCompanyQualifications,
  getCompanyRoles,
  getTaskInstanceValidation,
  postActivityTask,
  updateActivityTaskInstance,
  updateActivityTaskRequirements,
} from '@/features/activities/api/activity-tasks'
import type {
  ActivityTask,
  ActivityTaskInstance,
  ActivityTaskRequirements,
  CompanyQualification,
  CompanyRole,
  CreateActivityTaskInput,
  CreateActivityTaskInstanceInput,
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

export function useTaskInstanceValidation(taskInstanceId: string | undefined) {
  const { isAuthenticated } = useAuthSession()

  return useQuery<TaskValidationResult>({
    queryKey: taskInstanceValidationQueryKey(taskInstanceId),
    queryFn: () => getTaskInstanceValidation(taskInstanceId as string),
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
