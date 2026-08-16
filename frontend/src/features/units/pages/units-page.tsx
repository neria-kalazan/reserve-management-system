import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuthSession } from '@/app/auth/use-auth-session'
import { ContentContainer } from '@/app/layout/content-container'
import { PageHeader } from '@/app/layout/page-header'
import { useCompanyUnits } from '@/features/units/queries/use-units'
import { ErrorState } from '@/shared/components/error-state'
import { LoadingState } from '@/shared/components/loading-state'
import { Button } from '@/shared/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'

const PAGE_SIZE = 10

export function UnitsPage() {
  const navigate = useNavigate()
  const { user } = useAuthSession()
  const companyId = user?.companyId
  const unitsQuery = useCompanyUnits(companyId)
  const [page, setPage] = useState(1)

  const units = unitsQuery.data ?? []
  const totalPages = Math.max(1, Math.ceil(units.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  const pageUnits = useMemo(() => {
    const from = (safePage - 1) * PAGE_SIZE
    return units.slice(from, from + PAGE_SIZE)
  }, [safePage, units])

  const goToPreviousPage = () => setPage((current) => Math.max(1, current - 1))
  const goToNextPage = () => setPage((current) => Math.min(totalPages, current + 1))

  return (
    <>
      <PageHeader
        title="יחידות"
        description="רשימת היחידות של החברה עם מידע בסיסי על כל יחידה."
        actions={
          <Button type="button" onClick={() => navigate('/units/new')}>
            יצירת יחידה
          </Button>
        }
      />

      <ContentContainer className="space-y-5 pb-10">
        {unitsQuery.isPending ? (
          <LoadingState title="טוען יחידות" description="רשימת היחידות נטענת כעת." />
        ) : unitsQuery.isError ? (
          <ErrorState
            title="טעינת יחידות נכשלה"
            description="לא הצלחנו לטעון את רשימת היחידות. אפשר לנסות שוב."
            action={
              <Button type="button" variant="secondary" onClick={() => void unitsQuery.refetch()}>
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
                    <TableHead>סדר תצוגה</TableHead>
                    <TableHead className="w-24">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageUnits.length > 0 ? (
                    pageUnits.map((unit) => (
                      <TableRow key={unit.id}>
                        <TableCell>{unit.name}</TableCell>
                        <TableCell>{unit.description ?? '—'}</TableCell>
                        <TableCell>{unit.displayOrder}</TableCell>
                        <TableCell>
                          <Button type="button" variant="secondary" size="sm" onClick={() => navigate(`/units/${unit.id}/edit`)}>
                            עריכה
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-muted">
                        אין יחידות להצגה
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
              <div className="text-sm text-muted">
                {units.length > 0 ? `עמוד ${safePage} מתוך ${totalPages}` : 'לא נמצאו יחידות'}
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
