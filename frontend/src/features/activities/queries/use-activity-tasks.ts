import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuthSession } from '@/app/auth/use-auth-session'
import {
  getActivityTasks,
  postActivityTask,
} from '@/features/activities/api/activity-tasks'
import type {
  ActivityTask,
  CreateActivityTaskInput,
} from '@/features/activities/api/activity-tasks'

export const activityTasksQueryKey = (activityId: string | undefined) =>
  ['activities', activityId, 'tasks'] as const

export function useActivityTasks(activityId: string | undefined) {
  const { isAuthenticated } = useAuthSession()

  return useQuery<ActivityTask[]>({
    queryKey: activityTasksQueryKey(activityId),
    queryFn: () => getActivityTasks(activityId as string),
    enabled: isAuthenticated && typeof activityId === 'string' && activityId.length > 0,
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
