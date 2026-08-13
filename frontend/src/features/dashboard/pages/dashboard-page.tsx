import { useCompanyDashboard } from '@/features/dashboard/queries/use-company-dashboard'
import { ContentContainer } from '@/app/layout/content-container'
import { PageHeader } from '@/app/layout/page-header'
import { DashboardOverview } from '@/features/dashboard/components/dashboard-overview'
import { ErrorState } from '@/shared/components/error-state'
import { LoadingState } from '@/shared/components/loading-state'
import { Button } from '@/shared/components/ui/button'

export function DashboardPage() {
  const dashboardQuery = useCompanyDashboard()

  return (
    <>
      <PageHeader title="דשבורד" description="תמונת מצב עדכנית של הפלוגה" />
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
        ) : (
          <DashboardOverview dashboard={dashboardQuery.data} />
        )}
      </ContentContainer>
    </>
  )
}