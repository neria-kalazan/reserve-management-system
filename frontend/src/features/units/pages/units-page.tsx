import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuthSession } from '@/app/auth/use-auth-session'
import { ContentContainer } from '@/app/layout/content-container'
import { PageHeader } from '@/app/layout/page-header'
import { useCompanyUnits, useDeleteUnit } from '@/features/units/queries/use-units'
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
  const deleteUnitMutation = useDeleteUnit()
  const deleteInFlight = deleteUnitMutation?.isPending ?? false
  const [page, setPage] = useState(1)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const units = unitsQuery.data ?? []
  const totalPages = Math.max(1, Math.ceil(units.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  const pageUnits = useMemo(() => {
    const from = (safePage - 1) * PAGE_SIZE
    return units.slice(from, from + PAGE_SIZE)
  }, [safePage, units])

  const goToPreviousPage = () => setPage((current) => Math.max(1, current - 1))
  const goToNextPage = () => setPage((current) => Math.min(totalPages, current + 1))

  const onDelete = async (unitId: string) => {
    setPendingDeleteId(unitId)
    setDeleteError(null)

    try {
      await deleteUnitMutation.mutateAsync(unitId)
      setPendingDeleteId(null)
      setConfirmDeleteId(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'לא הצלחנו למחוק את המסגרת.'
      setDeleteError(message)
      setPendingDeleteId(null)
    }
  }

  return (
    <>
      <PageHeader
        title="מסגרות"
        description="רשימת המסגרות של החברה עם מידע בסיסי על כל מסגרת."
        actions={
          <Button type="button" onClick={() => navigate('/units/new')}>
            יצירת מסגרת
          </Button>
        }
      />

      <ContentContainer className="space-y-5 pb-10">
        {deleteError ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {deleteError}
          </div>
        ) : null}

        {unitsQuery.isPending ? (
          <LoadingState title="טוען מסגרות" description="רשימת המסגרות נטענת כעת." />
        ) : unitsQuery.isError ? (
          <ErrorState
            title="טעינת מסגרות נכשלה"
            description="לא הצלחנו לטעון את רשימת המסגרות. אפשר לנסות שוב."
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
                    <TableHead className="w-32">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageUnits.length > 0 ? (
                    pageUnits.map((unit) => (
                      <TableRow key={unit.id}>
                        <TableCell>{unit.name}</TableCell>
                        <TableCell>{unit.description ?? '—'}</TableCell>
                        <TableCell>{unit.displayOrder}</TableCell>
                        <TableCell className="space-x-2">
                          <Button type="button" variant="secondary" size="sm" onClick={() => navigate(`/units/${unit.id}/edit`)}>
                            עריכה
                          </Button>
                          {confirmDeleteId === unit.id ? (
                            <div className="inline-flex items-center gap-2 align-middle">
                              <span className="text-xs text-muted">האם למחוק את המסגרת?</span>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => void onDelete(unit.id)}
                                disabled={pendingDeleteId === unit.id || deleteInFlight}
                              >
                                {pendingDeleteId === unit.id ? 'מוחק...' : 'אישור מחיקה'}
                              </Button>
                              <Button type="button" variant="secondary" size="sm" onClick={() => setConfirmDeleteId(null)}>
                                ביטול
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => setConfirmDeleteId(unit.id)}
                              disabled={deleteInFlight}
                            >
                              מחק
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-muted">
                        אין מסגרות להצגה
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
              <div className="text-sm text-muted">
                {units.length > 0 ? `עמוד ${safePage} מתוך ${totalPages}` : 'לא נמצאו מסגרות'}
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
