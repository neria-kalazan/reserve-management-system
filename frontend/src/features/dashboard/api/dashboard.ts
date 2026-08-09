import { api } from '@/api/client'
import type { CompanyDashboardResponse } from '@/features/dashboard/types/dashboard'

export const getCompanyDashboard = (companyId: string) =>
  api.get<CompanyDashboardResponse>(`/companies/${encodeURIComponent(companyId)}/dashboard`)