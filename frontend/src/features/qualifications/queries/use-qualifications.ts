import { useQuery } from '@tanstack/react-query'

import { useAuthSession } from '@/app/auth/use-auth-session'
import { getCompanyQualifications } from '@/features/qualifications/api/qualifications'
import type { CompanyQualification } from '@/features/qualifications/api/qualifications'

export const companyQualificationsQueryKey = (companyId: string | undefined) =>
  ['companies', companyId, 'qualifications'] as const

export function useCompanyQualifications(companyId: string | undefined) {
  const { isAuthenticated } = useAuthSession()

  return useQuery<CompanyQualification[]>({
    queryKey: companyQualificationsQueryKey(companyId),
    queryFn: () => getCompanyQualifications(companyId as string),
    enabled: isAuthenticated && typeof companyId === 'string' && companyId.length > 0,
  })
}
