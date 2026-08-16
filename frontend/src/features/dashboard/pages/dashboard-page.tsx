import { useMemo } from 'react'

import { useAuthSession } from '@/app/auth/use-auth-session'
import { ContentContainer } from '@/app/layout/content-container'
import { PageHeader } from '@/app/layout/page-header'
import { DashboardOverview } from '@/features/dashboard/components/dashboard-overview'
import { useCompanyDashboard } from '@/features/dashboard/queries/use-company-dashboard'
import { useCompanyQualifications } from '@/features/qualifications/queries/use-qualifications'
import { useCompanyRoles } from '@/features/roles/queries/use-roles'
import { useCompanyUnits } from '@/features/units/queries/use-units'
import { useCompanyUsers } from '@/features/users/queries/use-users'
import { ErrorState } from '@/shared/components/error-state'
import { LoadingState } from '@/shared/components/loading-state'
import { Button } from '@/shared/components/ui/button'

export function DashboardPage() {
  const dashboardQuery = useCompanyDashboard()
  const { user } = useAuthSession()
  const companyId = user?.companyId

  const rolesQuery = useCompanyRoles(companyId, { page: 1, pageSize: 1 })
  const qualificationsQuery = useCompanyQualifications(companyId, { page: 1, pageSize: 1 })
  const unitsQuery = useCompanyUnits(companyId, { page: 1, pageSize: 1 })
  const usersQuery = useCompanyUsers(companyId, { page: 1, pageSize: 500, sortBy: 'firstName', sortOrder: 'asc' })

  const roleHolders = useMemo(() => {
    const holderMap = new Map<string, string[]>()

    for (const userRecord of usersQuery.data?.items ?? []) {
      if (!userRecord.isActive) {
        continue
      }

      for (const role of userRecord.roles ?? []) {
        const current = holderMap.get(role.name) ?? []
        current.push(`${userRecord.firstName} ${userRecord.lastName}`.trim())
        holderMap.set(role.name, current)
      }
    }

    return Array.from(holderMap.entries())
      .map(([role, holders]) => ({ role, holders: [...new Set(holders)] }))
      .sort((a, b) => a.role.localeCompare(b.role))
  }, [usersQuery.data?.items])

  const dashboardReady = !dashboardQuery.isPending && !dashboardQuery.isError && dashboardQuery.data

  return (
    <>
      <PageHeader title="דשבורד" description="תמונת מצב עדכנית של החברה" />
      <ContentContainer className="pb-10">
        {dashboardQuery.isPending ? (
          <LoadingState title="טוען דשבורד" description="נתוני הדשבורד נטענים כעת." />
        ) : dashboardQuery.isError ? (
          <ErrorState
            title="טעינת הדשבורד נכשלה"
            description="לא הצלחנו לטעון את נתוני הדשבורד. אפשר לנסות שוב."
            action={
              <Button type="button" variant="secondary" onClick={() => void dashboardQuery.refetch()}>
                ניסיון חוזר
              </Button>
            }
          />
        ) : dashboardReady ? (
          <DashboardOverview
            dashboard={dashboardQuery.data}
            roleHolders={roleHolders}
            totals={{
              totalPersonnel: dashboardQuery.data.companySummary.totalSoldiers,
              totalUnits: unitsQuery.data?.total ?? 0,
              totalRoles: rolesQuery.data?.total ?? 0,
              totalQualifications: qualificationsQuery.data?.total ?? 0,
            }}
          />
        ) : null}
      </ContentContainer>
    </>
  )
}