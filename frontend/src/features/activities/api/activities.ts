import { api } from '@/api/client'
import type {
  Activity,
  CreateActivityInput,
  UpdateActivityInput,
} from '@/features/activities/types/activity'

export const getCompanyActivities = (companyId: string) =>
  api.get<Activity[]>(`/companies/${encodeURIComponent(companyId)}/activities`)

export const getActivityById = (activityId: string) =>
  api.get<Activity>(`/activities/${encodeURIComponent(activityId)}`)

export const postCompanyActivity = (companyId: string, body: CreateActivityInput) =>
  api.post<Activity, CreateActivityInput>(
    `/companies/${encodeURIComponent(companyId)}/activities`,
    body,
  )

export const patchActivity = (activityId: string, body: UpdateActivityInput) =>
  api.patch<Activity, UpdateActivityInput>(
    `/activities/${encodeURIComponent(activityId)}`,
    body,
  )
