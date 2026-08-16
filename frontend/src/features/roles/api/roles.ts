import { api } from '@/api/client'

export interface CompanyRole {
  id: string
  name: string
  description?: string | null
  createdAt?: string
}

export const getCompanyRoles = (companyId: string) =>
  api.get<CompanyRole[]>(`/companies/${encodeURIComponent(companyId)}/roles`)
