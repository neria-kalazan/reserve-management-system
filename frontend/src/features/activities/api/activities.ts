import { api } from '@/api/client'
import type {
  Activity,
  ActivityAvailabilityRecord,
  ActivityOverview,
  ActivityPersonnelStatusMatrix,
  BulkActivityAvailabilityUpdateInput,
  BulkActivityAvailabilityUpdateResponse,
  CreateActivityInput,
  DailyStatus,
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

export const getActivityPersonnelStatusMatrix = (activityId: string) =>
  api.get<ActivityPersonnelStatusMatrix>(`/activities/${encodeURIComponent(activityId)}/personnel-status-matrix`)

export interface CreateActivityUserStatusInput {
  date: string
  status: DailyStatus
}

export const createActivityUserStatus = (
  activityId: string,
  userId: string,
  body: CreateActivityUserStatusInput,
) => api.post<{ id: string }>(`/activities/${encodeURIComponent(activityId)}/users/${encodeURIComponent(userId)}/status`, body)

export const updateActivityUserStatus = (
  activityId: string,
  userId: string,
  body: CreateActivityUserStatusInput,
) => api.patch<{ id: string }>(`/activities/${encodeURIComponent(activityId)}/users/${encodeURIComponent(userId)}/status`, body)

export const deleteActivityUserStatus = (activityId: string, userId: string, date: string) =>
  api.delete<{ id: string }>(`/activities/${encodeURIComponent(activityId)}/users/${encodeURIComponent(userId)}/status?date=${encodeURIComponent(date)}`)

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
