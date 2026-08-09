import { useQuery } from '@tanstack/react-query'

import { useAuthSession } from '@/app/auth/use-auth-session'
import { getCompanyDashboard } from '@/features/dashboard/api/dashboard'

export const companyDashboardQueryKey = (companyId: string | undefined) =>
  ['companies', companyId, 'dashboard'] as const

export function useCompanyDashboard() {
  const { isAuthenticated, user } = useAuthSession()
  const companyId = user?.companyId

  return useQuery({
    queryKey: companyDashboardQueryKey(companyId),
    queryFn: () => getCompanyDashboard(companyId as string),
    enabled: isAuthenticated && typeof companyId === 'string' && companyId.length > 0,
  })
}