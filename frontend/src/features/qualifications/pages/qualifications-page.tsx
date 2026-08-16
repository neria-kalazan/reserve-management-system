import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuthSession } from '@/app/auth/use-auth-session'
import { ContentContainer } from '@/app/layout/content-container'
import { PageHeader } from '@/app/layout/page-header'
import { useCompanyQualifications } from '@/features/qualifications/queries/use-qualifications'
import { ErrorState } from '@/shared/components/error-state'
import { LoadingState } from '@/shared/components/loading-state'
import { Button } from '@/shared/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'

const PAGE_SIZE = 10

export function QualificationsPage() {
  const navigate = useNavigate()
  const { user } = useAuthSession()
  const companyId = user?.companyId
  const qualificationsQuery = useCompanyQualifications(companyId)
  const [page, setPage] = useState(1)

  const qualifications = qualificationsQuery.data ?? []
  const totalPages = Math.max(1, Math.ceil(qualifications.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  const pageQualifications = useMemo(() => {
    const from = (safePage - 1) * PAGE_SIZE
    return qualifications.slice(from, from + PAGE_SIZE)
  }, [safePage, qualifications])

  const goToPreviousPage = () => setPage((current) => Math.max(1, current - 1))
  const goToNextPage = () => setPage((current) => Math.min(totalPages, current + 1))

  return (
    <>
      <PageHeader
        title="הסמכות"
        description="רשימת ההסמכות של החברה עם פרטים בסיסיים על כל הסמכה."
        actions={
          <Button type="button" onClick={() => navigate('/qualifications/new')}>
            יצירת הסמכה
          </Button>
        }
      />

      <ContentContainer className="space-y-5 pb-10">
        {qualificationsQuery.isPending ? (
          <LoadingState title="טוען הסמכות" description="רשימת ההסמכות נטענת כעת." />
        ) : qualificationsQuery.isError ? (
          <ErrorState
            title="טעינת הסמכות נכשלה"
            description="לא הצלחנו לטעון את רשימת ההסמכות. אפשר לנסות שוב."
            action={
              <Button type="button" variant="secondary" onClick={() => void qualificationsQuery.refetch()}>
                ניסיון חוזר
              </Button>
            }
          />
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border border-border bg-surface">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>שם</TableHead>
                    <TableHead>תיאור</TableHead>
                    <TableHead className="w-24">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageQualifications.length > 0 ? (
                    pageQualifications.map((qualification) => (
                      <TableRow key={qualification.id}>
                        <TableCell>{qualification.name}</TableCell>
                        <TableCell>{qualification.description ?? '—'}</TableCell>
                        <TableCell>
                          <Button type="button" variant="secondary" size="sm" onClick={() => navigate(`/qualifications/${qualification.id}/edit`)}>
                            עריכה
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="py-10 text-center text-muted">
                        אין הסמכות להצגה
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
              <div className="text-sm text-muted">
                {qualifications.length > 0 ? `עמוד ${safePage} מתוך ${totalPages}` : 'לא נמצאו הסמכות'}
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={goToPreviousPage} disabled={safePage <= 1}>
                  הקודם
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={goToNextPage} disabled={safePage >= totalPages}>
                  הבא
                </Button>
              </div>
            </div>
          </>
        )}
      </ContentContainer>
    </>
  )
}
