import { api } from '@/api/client'

export interface ActivityTask {
  id: string
  activityId: string
  name: string
  description: string | null
  createdAt?: string
  updatedAt?: string
}

export interface CreateActivityTaskInput {
  name: string
  description?: string
}

export const getActivityTasks = (activityId: string) =>
  api.get<ActivityTask[]>(`/activities/${encodeURIComponent(activityId)}/tasks`)

export const postActivityTask = (activityId: string, body: CreateActivityTaskInput) =>
  api.post<ActivityTask>(`/activities/${encodeURIComponent(activityId)}/tasks`, body)
