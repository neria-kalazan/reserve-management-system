import { api } from '@/api/client'
import type {
  Activity,
  ActivityAvailabilityRecord,
  ActivityOverview,
  BulkActivityAvailabilityUpdateInput,
  BulkActivityAvailabilityUpdateResponse,
  CreateActivityInput,
  UpdateActivityInput,
} from '@/features/activities/types/activity'

export const getCompanyActivities = (companyId: string) =>
  api.get<Activity[]>(`/companies/${encodeURIComponent(companyId)}/activities`)

export const getActivityById = (activityId: string) =>
  api.get<Activity>(`/activities/${encodeURIComponent(activityId)}`)

export const getActivityOverview = (activityId: string) =>
  api.get<ActivityOverview>(`/activities/${encodeURIComponent(activityId)}/overview`)

export const getActivityAvailability = (activityId: string) =>
  api.get<ActivityAvailabilityRecord[]>(`/activities/${encodeURIComponent(activityId)}/availability`)

export const generateActivityAvailability = (activityId: string) =>
  api.post<ActivityAvailabilityRecord[]>(`/activities/${encodeURIComponent(activityId)}/availability/generate`)

export const bulkUpdateActivityAvailability = (
  activityId: string,
  body: BulkActivityAvailabilityUpdateInput,
) =>
  api.patch<BulkActivityAvailabilityUpdateResponse>(
    `/activities/${encodeURIComponent(activityId)}/availability/bulk`,
    body,
  )

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
