import { api } from '@/api/client'

export interface CompanyQualification {
  id: string
  name: string
  description?: string | null
  createdAt?: string
}

export const getCompanyQualifications = (companyId: string) =>
  api.get<CompanyQualification[]>(`/companies/${encodeURIComponent(companyId)}/qualifications`)
