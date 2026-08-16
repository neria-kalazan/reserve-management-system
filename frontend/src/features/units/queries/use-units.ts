import { useQuery } from '@tanstack/react-query'

import { useAuthSession } from '@/app/auth/use-auth-session'
import { getCompanyUnits } from '@/features/units/api/units'
import type { CompanyUnit } from '@/features/units/api/units'

export const companyUnitsQueryKey = (companyId: string | undefined) =>
  ['companies', companyId, 'units'] as const

export function useCompanyUnits(companyId: string | undefined) {
  const { isAuthenticated } = useAuthSession()

  return useQuery<CompanyUnit[]>({
    queryKey: companyUnitsQueryKey(companyId),
    queryFn: () => getCompanyUnits(companyId as string),
    enabled: isAuthenticated && typeof companyId === 'string' && companyId.length > 0,
  })
}
