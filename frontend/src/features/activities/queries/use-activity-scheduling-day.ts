import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuthSession } from '@/app/auth/use-auth-session'
import {
  approveActivitySchedulingDay,
  getActivitySchedulingDay,
  openActivitySchedulingDay,
  returnActivitySchedulingDayToDraft,
  submitActivitySchedulingDayForApproval,
  type SchedulingDayResponse,
} from '@/features/activities/api/scheduling-day'

export const activitySchedulingDayQueryKey = (
  activityId: string | undefined,
  date: string | undefined,
) => ['activities', activityId, 'scheduling', 'day', date] as const

export function useActivitySchedulingDay(
  activityId: string | undefined,
  date: string | undefined,
) {
  const { isAuthenticated } = useAuthSession()

  return useQuery<SchedulingDayResponse>({
    queryKey: activitySchedulingDayQueryKey(activityId, date),
    queryFn: () => getActivitySchedulingDay(activityId as string, date as string),
    enabled:
      isAuthenticated &&
      typeof activityId === 'string' &&
      activityId.length > 0 &&
      typeof date === 'string' &&
      date.length > 0,
  })
}

export function useOpenActivitySchedulingDay(
  activityId: string | undefined,
  date: string | undefined,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => {
      if (typeof activityId !== 'string' || activityId.length === 0) {
        throw new Error('Cannot open scheduling day without a valid activity id.')
      }

      if (typeof date !== 'string' || date.length === 0) {
        throw new Error('Cannot open scheduling day without a valid date.')
      }

      return openActivitySchedulingDay(activityId, { date })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: activitySchedulingDayQueryKey(activityId, date),
      })
    },
  })
}

const buildSchedulingDayMutation = (
  activityId: string | undefined,
  date: string | undefined,
  mutateFn: (activityId: string, body: { date: string }) => Promise<unknown>,
) => ({
  mutationFn: () => {
    if (typeof activityId !== 'string' || activityId.length === 0) {
      throw new Error('Cannot mutate scheduling day status without a valid activity id.')
    }

    if (typeof date !== 'string' || date.length === 0) {
      throw new Error('Cannot mutate scheduling day status without a valid date.')
    }

    return mutateFn(activityId, { date })
  },
})

export function useSubmitActivitySchedulingDayForApproval(
  activityId: string | undefined,
  date: string | undefined,
) {
  const queryClient = useQueryClient()

  return useMutation({
    ...buildSchedulingDayMutation(activityId, date, submitActivitySchedulingDayForApproval),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: activitySchedulingDayQueryKey(activityId, date),
      })
    },
  })
}

export function useApproveActivitySchedulingDay(
  activityId: string | undefined,
  date: string | undefined,
) {
  const queryClient = useQueryClient()

  return useMutation({
    ...buildSchedulingDayMutation(activityId, date, approveActivitySchedulingDay),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: activitySchedulingDayQueryKey(activityId, date),
      })
    },
  })
}

export function useReturnActivitySchedulingDayToDraft(
  activityId: string | undefined,
  date: string | undefined,
) {
  const queryClient = useQueryClient()

  return useMutation({
    ...buildSchedulingDayMutation(activityId, date, returnActivitySchedulingDayToDraft),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: activitySchedulingDayQueryKey(activityId, date),
      })
    },
  })
}
