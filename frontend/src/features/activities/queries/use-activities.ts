import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuthSession } from '@/app/auth/use-auth-session'
import {
  bulkUpdateActivityAvailability,
  createActivityUserStatus,
  deleteActivityUserStatus,
  generateActivityAvailability,
  getActivityAvailability,
  getActivityById,
  getActivityOverview,
  getActivityPersonnelStatusMatrix,
  getCompanyActivities,
  patchActivity,
  postCompanyActivity,
  updateActivityUserStatus,
} from '@/features/activities/api/activities'
import type {
  Activity,
  ActivityAvailabilityRecord,
  ActivityOverview,
  ActivityPersonnelStatusMatrix,
  BulkActivityAvailabilityUpdateInput,
  CreateActivityInput,
  DailyStatus,
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

export const activityPersonnelStatusMatrixQueryKey = (activityId: string | undefined) =>
  ['activities', activityId, 'personnel-status-matrix'] as const

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

export function useActivityPersonnelStatusMatrix(activityId: string | undefined) {
  const { isAuthenticated } = useAuthSession()

  return useQuery<ActivityPersonnelStatusMatrix>({
    queryKey: activityPersonnelStatusMatrixQueryKey(activityId),
    queryFn: () => getActivityPersonnelStatusMatrix(activityId as string),
    enabled: isAuthenticated && typeof activityId === 'string' && activityId.length > 0,
  })
}

const applyPersonnelStatusMatrixUpdate = (
  current: ActivityPersonnelStatusMatrix | undefined,
  userId: string,
  dateKey: string,
  nextStatus: DailyStatus | null,
): ActivityPersonnelStatusMatrix | undefined => {
  if (!current) {
    return current
  }

  const previousStatus = current.rows.find((row) => row.user.id === userId)?.cells[dateKey] ?? null
  if (previousStatus === nextStatus) {
    return current
  }

  const rows = current.rows.map((row) => {
    if (row.user.id !== userId) {
      return row
    }

    const cells = { ...row.cells }
    if (nextStatus === null) {
      delete cells[dateKey]
    } else {
      cells[dateKey] = nextStatus
    }

    const summary = { ...row.summary }
    const decrementIfPresent = (status: DailyStatus | null) => {
      if (status === 'ACTIVE') summary.activeCount = Math.max(0, summary.activeCount - 1)
      if (status === 'HOLIDAY') summary.holidayCount = Math.max(0, summary.holidayCount - 1)
      if (status === 'SICK') summary.sickCount = Math.max(0, summary.sickCount - 1)
      if (status === 'RELEASED') summary.releasedCount = Math.max(0, summary.releasedCount - 1)
    }

    const incrementIfPresent = (status: DailyStatus | null) => {
      if (status === 'ACTIVE') summary.activeCount += 1
      if (status === 'HOLIDAY') summary.holidayCount += 1
      if (status === 'SICK') summary.sickCount += 1
      if (status === 'RELEASED') summary.releasedCount += 1
    }

    decrementIfPresent(previousStatus)
    incrementIfPresent(nextStatus)
    summary.yamam = summary.activeCount + summary.holidayCount + summary.sickCount
    summary.complete = current.dates.every((key) => (cells[key] ?? null) !== null)

    return { ...row, cells, summary }
  })

  const dailySummary = current.dailySummary.map((entry) => {
    if (entry.date !== dateKey) {
      return entry
    }

    const nextEntry = { ...entry }
    if (previousStatus === 'ACTIVE') nextEntry.activeCount = Math.max(0, nextEntry.activeCount - 1)
    if (previousStatus === 'HOLIDAY') nextEntry.holidayCount = Math.max(0, nextEntry.holidayCount - 1)
    if (previousStatus === 'SICK') nextEntry.sickCount = Math.max(0, nextEntry.sickCount - 1)
    if (previousStatus === 'RELEASED') nextEntry.releasedCount = Math.max(0, nextEntry.releasedCount - 1)

    if (nextStatus === 'ACTIVE') nextEntry.activeCount += 1
    if (nextStatus === 'HOLIDAY') nextEntry.holidayCount += 1
    if (nextStatus === 'SICK') nextEntry.sickCount += 1
    if (nextStatus === 'RELEASED') nextEntry.releasedCount += 1

    nextEntry.yamam = nextEntry.activeCount + nextEntry.holidayCount + nextEntry.sickCount
    return nextEntry
  })

  return { ...current, rows, dailySummary }
}

const updatePersonnelStatusMatrixCache = (
  queryClient: ReturnType<typeof useQueryClient>,
  activityId: string,
  userId: string,
  dateKey: string,
  nextStatus: DailyStatus | null,
) => {
  queryClient.setQueryData<ActivityPersonnelStatusMatrix | undefined>(
    activityPersonnelStatusMatrixQueryKey(activityId),
    (current) => applyPersonnelStatusMatrixUpdate(current, userId, dateKey, nextStatus),
  )
}

export interface CreateActivityUserStatusMutationInput {
  userId: string
  date: string
  status: DailyStatus
}

export function useCreateActivityUserStatus(activityId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, date, status }: CreateActivityUserStatusMutationInput) => {
      if (typeof activityId !== 'string' || activityId.length === 0) {
        throw new Error('Cannot create personnel status without a valid activity id.')
      }

      return createActivityUserStatus(activityId, userId, { date, status })
    },
    onMutate: async ({ userId, date, status }) => {
      if (typeof activityId !== 'string' || activityId.length === 0) {
        return { previousMatrix: undefined }
      }

      await queryClient.cancelQueries({ queryKey: activityPersonnelStatusMatrixQueryKey(activityId) })
      const previousMatrix = queryClient.getQueryData<ActivityPersonnelStatusMatrix>(
        activityPersonnelStatusMatrixQueryKey(activityId),
      )

      updatePersonnelStatusMatrixCache(queryClient, activityId, userId, date, status)
      return { previousMatrix }
    },
    onError: (_, __, context) => {
      if (context?.previousMatrix && typeof activityId === 'string' && activityId.length > 0) {
        queryClient.setQueryData(activityPersonnelStatusMatrixQueryKey(activityId), context.previousMatrix)
      }
    },
    onSuccess: async () => {
      if (typeof activityId !== 'string' || activityId.length === 0) {
        return
      }

      await queryClient.invalidateQueries({ queryKey: activityOverviewQueryKey(activityId) })
    },
  })
}

export interface UpdateActivityUserStatusMutationInput {
  userId: string
  date: string
  status: DailyStatus
}

export function useUpdateActivityUserStatus(activityId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, date, status }: UpdateActivityUserStatusMutationInput) => {
      if (typeof activityId !== 'string' || activityId.length === 0) {
        throw new Error('Cannot update personnel status without a valid activity id.')
      }

      return updateActivityUserStatus(activityId, userId, { date, status })
    },
    onMutate: async ({ userId, date, status }) => {
      if (typeof activityId !== 'string' || activityId.length === 0) {
        return { previousMatrix: undefined }
      }

      await queryClient.cancelQueries({ queryKey: activityPersonnelStatusMatrixQueryKey(activityId) })
      const previousMatrix = queryClient.getQueryData<ActivityPersonnelStatusMatrix>(
        activityPersonnelStatusMatrixQueryKey(activityId),
      )

      updatePersonnelStatusMatrixCache(queryClient, activityId, userId, date, status)
      return { previousMatrix }
    },
    onError: (_, __, context) => {
      if (context?.previousMatrix && typeof activityId === 'string' && activityId.length > 0) {
        queryClient.setQueryData(activityPersonnelStatusMatrixQueryKey(activityId), context.previousMatrix)
      }
    },
    onSuccess: async () => {
      if (typeof activityId !== 'string' || activityId.length === 0) {
        return
      }

      await queryClient.invalidateQueries({ queryKey: activityOverviewQueryKey(activityId) })
    },
  })
}

export interface DeleteActivityUserStatusMutationInput {
  userId: string
  date: string
}

export function useDeleteActivityUserStatus(activityId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, date }: DeleteActivityUserStatusMutationInput) => {
      if (typeof activityId !== 'string' || activityId.length === 0) {
        throw new Error('Cannot delete personnel status without a valid activity id.')
      }

      return deleteActivityUserStatus(activityId, userId, date)
    },
    onMutate: async ({ userId, date }) => {
      if (typeof activityId !== 'string' || activityId.length === 0) {
        return { previousMatrix: undefined }
      }

      await queryClient.cancelQueries({ queryKey: activityPersonnelStatusMatrixQueryKey(activityId) })
      const previousMatrix = queryClient.getQueryData<ActivityPersonnelStatusMatrix>(
        activityPersonnelStatusMatrixQueryKey(activityId),
      )

      updatePersonnelStatusMatrixCache(queryClient, activityId, userId, date, null)
      return { previousMatrix }
    },
    onError: (_, __, context) => {
      if (context?.previousMatrix && typeof activityId === 'string' && activityId.length > 0) {
        queryClient.setQueryData(activityPersonnelStatusMatrixQueryKey(activityId), context.previousMatrix)
      }
    },
    onSuccess: async () => {
      if (typeof activityId !== 'string' || activityId.length === 0) {
        return
      }

      await queryClient.invalidateQueries({ queryKey: activityOverviewQueryKey(activityId) })
    },
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
