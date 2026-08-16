import { api } from '@/api/client'

export interface CompanyUnit {
  id: string
  name: string
  description?: string | null
  displayOrder: number
  createdAt?: string
}

export const getCompanyUnits = (companyId: string) =>
  api.get<CompanyUnit[]>(`/companies/${encodeURIComponent(companyId)}/units`)
