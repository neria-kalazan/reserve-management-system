import { api } from '@/api/client'

export interface CompanyUnit {
  id: string
  name: string
  description?: string | null
  displayOrder: number
  createdAt?: string
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

export const getCompanyUnits = (companyId: string) =>
  api.get<CompanyUnit[]>(`/companies/${encodeURIComponent(companyId)}/units`)

export const getUnitById = (unitId: string) =>
  api.get<CompanyUnit>(`/units/${encodeURIComponent(unitId)}`)

export const postCompanyUnit = (companyId: string, body: CreateUnitInput) =>
  api.post<CompanyUnit>(`/companies/${encodeURIComponent(companyId)}/units`, body)

export const patchUnit = (unitId: string, body: UpdateUnitInput) =>
  api.patch<CompanyUnit>(`/units/${encodeURIComponent(unitId)}`, body)
