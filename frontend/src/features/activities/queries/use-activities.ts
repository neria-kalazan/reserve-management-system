import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuthSession } from '@/app/auth/use-auth-session'
import {
  bulkUpdateActivityAvailability,
  generateActivityAvailability,
  getActivityAvailability,
  getActivityById,
  getActivityOverview,
  getCompanyActivities,
  patchActivity,
  postCompanyActivity,
} from '@/features/activities/api/activities'
import type {
  Activity,
  ActivityAvailabilityRecord,
  ActivityOverview,
  BulkActivityAvailabilityUpdateInput,
  CreateActivityInput,
  UpdateActivityInput,
} from '@/features/activities/types/activity'

export const activitiesListQueryKey = (companyId: string | undefined) =>
  ['companies', companyId, 'activities'] as const

export const activityDetailQueryKey = (activityId: string | undefined) =>
  ['activities', activityId] as const

export const activityOverviewQueryKey = (activityId: string | undefined) =>
  ['activities', activityId, 'overview'] as const

export const activityAvailabilityQueryKey = (activityId: string | undefined) =>
  ['activities', activityId, 'availability'] as const

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

export function useActivityOverview(activityId: string | undefined) {
  const { isAuthenticated } = useAuthSession()

  return useQuery<ActivityOverview>({
    queryKey: activityOverviewQueryKey(activityId),
    queryFn: () => getActivityOverview(activityId as string),
    enabled: isAuthenticated && typeof activityId === 'string' && activityId.length > 0,
  })
}

export function useActivityAvailability(activityId: string | undefined) {
  const { isAuthenticated } = useAuthSession()

  return useQuery<ActivityAvailabilityRecord[]>({
    queryKey: activityAvailabilityQueryKey(activityId),
    queryFn: () => getActivityAvailability(activityId as string),
    enabled: isAuthenticated && typeof activityId === 'string' && activityId.length > 0,
  })
}

export function useGenerateActivityAvailability(activityId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => {
      if (typeof activityId !== 'string' || activityId.length === 0) {
        throw new Error('Cannot generate availability without a valid activity id.')
      }

      return generateActivityAvailability(activityId)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: activityAvailabilityQueryKey(activityId) })
    },
  })
}

export function useBulkUpdateActivityAvailability(activityId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: BulkActivityAvailabilityUpdateInput) => {
      if (typeof activityId !== 'string' || activityId.length === 0) {
        throw new Error('Cannot bulk update availability without a valid activity id.')
      }

      return bulkUpdateActivityAvailability(activityId, body)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: activityAvailabilityQueryKey(activityId) })
    },
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
