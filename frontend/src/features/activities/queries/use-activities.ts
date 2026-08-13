import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuthSession } from '@/app/auth/use-auth-session'
import {
  getActivityById,
  getCompanyActivities,
  patchActivity,
  postCompanyActivity,
} from '@/features/activities/api/activities'
import type {
  Activity,
  CreateActivityInput,
  UpdateActivityInput,
} from '@/features/activities/types/activity'

export const activitiesListQueryKey = (companyId: string | undefined) =>
  ['companies', companyId, 'activities'] as const

export const activityDetailQueryKey = (activityId: string | undefined) =>
  ['activities', activityId] as const

export function useCompanyActivities() {
  const { isAuthenticated, user } = useAuthSession()
  const companyId = user?.companyId

  return useQuery({
    queryKey: activitiesListQueryKey(companyId),
    queryFn: () => getCompanyActivities(companyId as string),
    enabled: isAuthenticated && typeof companyId === 'string' && companyId.length > 0,
  })
}

export function useActivityById(activityId: string | undefined) {
  const { isAuthenticated } = useAuthSession()

  return useQuery({
    queryKey: activityDetailQueryKey(activityId),
    queryFn: () => getActivityById(activityId as string),
    enabled: isAuthenticated && typeof activityId === 'string' && activityId.length > 0,
  })
}

const ensureCompanyId = (companyId: string | undefined) => {
  if (typeof companyId !== 'string' || companyId.length === 0) {
    throw new Error('Cannot mutate activities without an authenticated company context.')
  }

  return companyId
}

export function useCreateActivity() {
  const queryClient = useQueryClient()
  const { user } = useAuthSession()
  const companyId = user?.companyId

  return useMutation({
    mutationFn: (body: CreateActivityInput) => {
      const scopedCompanyId = ensureCompanyId(companyId)
      return postCompanyActivity(scopedCompanyId, body)
    },
    onSuccess: async (createdActivity: Activity) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: activitiesListQueryKey(companyId) }),
        queryClient.invalidateQueries({ queryKey: activityDetailQueryKey(createdActivity.id) }),
      ])
    },
  })
}

export interface UpdateActivityMutationInput {
  activityId: string
  body: UpdateActivityInput
}

export function useUpdateActivity() {
  const queryClient = useQueryClient()
  const { user } = useAuthSession()
  const companyId = user?.companyId

  return useMutation({
    mutationFn: ({ activityId, body }: UpdateActivityMutationInput) =>
      patchActivity(activityId, body),
    onSuccess: async (updatedActivity: Activity, variables: UpdateActivityMutationInput) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: activitiesListQueryKey(companyId) }),
        queryClient.invalidateQueries({ queryKey: activityDetailQueryKey(variables.activityId) }),
        queryClient.invalidateQueries({ queryKey: activityDetailQueryKey(updatedActivity.id) }),
      ])
    },
  })
}
