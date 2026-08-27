import { useQuery } from '@tanstack/react-query'

import { useAuthSession } from '@/app/auth/use-auth-session'
import {
  getActivitySchedulingDay,
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
