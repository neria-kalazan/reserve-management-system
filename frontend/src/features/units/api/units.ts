import { api } from '@/api/client'

export interface CompanyUnit {
  id: string
  name: string
  description?: string | null
  displayOrder: number
  createdAt?: string
}

export interface CompanyUnitsPageResult {
  items: CompanyUnit[]
  total: number
  page: number
  pageSize: number
}

export interface CreateUnitInput {
  name: string
  description?: string | null
  displayOrder?: number
}

export interface UpdateUnitInput {
  name?: string
  description?: string | null
  displayOrder?: number
}

export const getCompanyUnits = (
  companyId: string,
  params?: { page?: number; pageSize?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' },
) => api.get<CompanyUnitsPageResult>(`/companies/${encodeURIComponent(companyId)}/units`, { params })

export const getUnitById = (unitId: string) =>
  api.get<CompanyUnit>(`/units/${encodeURIComponent(unitId)}`)

export const postCompanyUnit = (companyId: string, body: CreateUnitInput) =>
  api.post<CompanyUnit>(`/companies/${encodeURIComponent(companyId)}/units`, body)

export const patchUnit = (unitId: string, body: UpdateUnitInput) =>
  api.patch<CompanyUnit>(`/units/${encodeURIComponent(unitId)}`, body)

export const deleteUnit = (unitId: string) =>
  api.delete<CompanyUnit>(`/units/${encodeURIComponent(unitId)}`)
