import { useQuery } from '@tanstack/react-query'

import { useAuthSession } from '@/app/auth/use-auth-session'
import { getCompanyRoles } from '@/features/roles/api/roles'
import type { CompanyRole } from '@/features/roles/api/roles'

export const companyRolesQueryKey = (companyId: string | undefined) =>
  ['companies', companyId, 'roles'] as const

export function useCompanyRoles(companyId: string | undefined) {
  const { isAuthenticated } = useAuthSession()

  return useQuery<CompanyRole[]>({
    queryKey: companyRolesQueryKey(companyId),
    queryFn: () => getCompanyRoles(companyId as string),
    enabled: isAuthenticated && typeof companyId === 'string' && companyId.length > 0,
  })
}
