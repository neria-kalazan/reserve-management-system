import { api } from '@/api/client'

export interface CompanyQualification {
  id: string
  name: string
  description?: string | null
  createdAt?: string
}

export interface CompanyQualificationsPageResult {
  items: CompanyQualification[]
  total: number
  page: number
  pageSize: number
}

export interface CreateQualificationInput {
  name: string
  description?: string | null
}

export interface UpdateQualificationInput {
  name?: string
  description?: string | null
}

export const getCompanyQualifications = (
  companyId: string,
  params?: { page?: number; pageSize?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' },
) => api.get<CompanyQualificationsPageResult>(`/companies/${encodeURIComponent(companyId)}/qualifications`, { params })

export const getQualificationById = (qualificationId: string) =>
  api.get<CompanyQualification>(`/qualifications/${encodeURIComponent(qualificationId)}`)

export const postCompanyQualification = (companyId: string, body: CreateQualificationInput) =>
  api.post<CompanyQualification>(`/companies/${encodeURIComponent(companyId)}/qualifications`, body)

export const patchQualification = (qualificationId: string, body: UpdateQualificationInput) =>
  api.patch<CompanyQualification>(`/qualifications/${encodeURIComponent(qualificationId)}`, body)

export const deleteQualification = (qualificationId: string) =>
  api.delete<CompanyQualification>(`/qualifications/${encodeURIComponent(qualificationId)}`)
