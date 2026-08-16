import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuthSession } from '@/app/auth/use-auth-session'
import { ContentContainer } from '@/app/layout/content-container'
import { PageHeader } from '@/app/layout/page-header'
import { useCompanyUnits, useDeleteUnit } from '@/features/units/queries/use-units'
import { ErrorState } from '@/shared/components/error-state'
import { LoadingState } from '@/shared/components/loading-state'
import { Button } from '@/shared/components/ui/button'
import { Pagination } from '@/shared/components/ui/pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const
const SORTABLE_COLUMNS = ['name', 'description', 'displayOrder'] as const

type SortField = (typeof SORTABLE_COLUMNS)[number]
type SortOrder = 'asc' | 'desc'

export function UnitsPage() {
  const navigate = useNavigate()
  const { user } = useAuthSession()
  const companyId = user?.companyId
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(10)
  const [sortBy, setSortBy] = useState<SortField>('displayOrder')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const unitsQuery = useCompanyUnits(companyId, { page, pageSize, sortBy, sortOrder })
  const deleteUnitMutation = useDeleteUnit()
  const deleteInFlight = deleteUnitMutation?.isPending ?? false
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const units = unitsQuery.data?.items ?? []
  const total = unitsQuery.data?.total ?? 0
  const currentPageSize = unitsQuery.data?.pageSize ?? pageSize
  const totalPages = total === 0 ? 1 : Math.ceil(total / currentPageSize)
  const boundedPage = Math.min(Math.max(page, 1), totalPages)

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const pageUnits = useMemo(() => units, [units])

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }

    setPage(1)
  }

  const handlePageSizeChange = (nextPageSize: number) => {
    setPageSize(nextPageSize)
    setPage(1)
  }

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

  const getSortIndicator = (field: SortField) => {
    if (sortBy !== field) {
      return null
    }

    return sortOrder === 'asc' ? '↑' : '↓'
  }

  const getColumnLabel = (field: SortField) => {
    const labels: Record<SortField, string> = {
      name: 'שם',
      description: 'תיאור',
      displayOrder: 'סדר תצוגה',
    }

    return labels[field]
  }

  const renderSortButton = (field: SortField) => (
    <button
      type="button"
      onClick={() => handleSort(field)}
      className="inline-flex items-center gap-1 font-medium text-muted transition-colors hover:text-foreground"
      aria-label={`מיון לפי ${getColumnLabel(field)}`}
    >
      <span>{getColumnLabel(field)}</span>
      {getSortIndicator(field) ? <span aria-hidden="true">{getSortIndicator(field)}</span> : null}
    </button>
  )

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

        {unitsQuery.isPending && !unitsQuery.data ? (
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
                    <TableHead>{renderSortButton('name')}</TableHead>
                    <TableHead>{renderSortButton('description')}</TableHead>
                    <TableHead>{renderSortButton('displayOrder')}</TableHead>
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

            <Pagination
              page={boundedPage}
              pageSize={currentPageSize}
              total={total}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={(nextPage) => setPage(nextPage)}
              onPageSizeChange={(nextPageSize) => handlePageSizeChange(nextPageSize)}
              isLoading={unitsQuery.isFetching}
            />
          </>
        )}
      </ContentContainer>
    </>
  )
}
