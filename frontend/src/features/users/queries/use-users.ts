import { useQuery } from '@tanstack/react-query'

import { useAuthSession } from '@/app/auth/use-auth-session'
import { getCompanyUsers } from '@/features/activities/api/activity-tasks'
import type { CompanyUser } from '@/features/activities/api/activity-tasks'

export const companyUsersQueryKey = (companyId: string | undefined) =>
  ['companies', companyId, 'users'] as const

export function useCompanyUsers(companyId: string | undefined) {
  const { isAuthenticated } = useAuthSession()

  return useQuery<CompanyUser[]>({
    queryKey: companyUsersQueryKey(companyId),
    queryFn: () => getCompanyUsers(companyId as string),
    enabled: isAuthenticated && typeof companyId === 'string' && companyId.length > 0,
  })
}
