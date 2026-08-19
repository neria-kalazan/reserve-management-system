import { useMemo, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useAuthSession } from '@/app/auth/use-auth-session'
import { ContentContainer } from '@/app/layout/content-container'
import { PageHeader } from '@/app/layout/page-header'
import { useCompanyQualifications, useDeleteQualification } from '@/features/qualifications/queries/use-qualifications'
import { ErrorState } from '@/shared/components/error-state'
import { LoadingState } from '@/shared/components/loading-state'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Pagination } from '@/shared/components/ui/pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip'

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const
const SORTABLE_COLUMNS = ['name', 'description'] as const

type SortField = (typeof SORTABLE_COLUMNS)[number]
type SortOrder = 'asc' | 'desc'

export function QualificationsPage() {
  const navigate = useNavigate()
  const { user } = useAuthSession()
  const companyId = user?.companyId
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(10)
  const [sortBy, setSortBy] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const qualificationsQuery = useCompanyQualifications(companyId, { page, pageSize, sortBy, sortOrder })
  const deleteQualificationMutation = useDeleteQualification()
  const deleteInFlight = deleteQualificationMutation?.isPending ?? false
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const qualifications = qualificationsQuery.data?.items ?? []
  const total = qualificationsQuery.data?.total ?? 0
  const currentPageSize = qualificationsQuery.data?.pageSize ?? pageSize
  const totalPages = total === 0 ? 1 : Math.ceil(total / currentPageSize)
  const boundedPage = Math.min(Math.max(page, 1), totalPages)

  const pageQualifications = useMemo(() => qualifications, [qualifications])

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

  const onDelete = async (qualificationId: string) => {
    setPendingDeleteId(qualificationId)
    setDeleteError(null)

    try {
      await deleteQualificationMutation.mutateAsync(qualificationId)
      setPendingDeleteId(null)
      setDeleteTargetId(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'לא הצלחנו למחוק את ההסמכה.'
      setDeleteError(message)
      setPendingDeleteId(null)
    }
  }

  const deleteTarget = deleteTargetId ? qualifications.find((qualification) => qualification.id === deleteTargetId) ?? null : null

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
        title="הסמכות"
        description="רשימת ההסמכות של הפלוגה עם פרטים בסיסיים על כל הסמכה."
        actions={
          <Button type="button" onClick={() => navigate('/qualifications/new')}>
            יצירת הסמכה
          </Button>
        }
      />

      <Dialog open={Boolean(deleteTargetId)} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>אישור מחיקה</DialogTitle>
            <DialogDescription>{deleteTarget ? `האם למחוק את ההסמכה ${deleteTarget.name}?` : 'האם למחוק את ההסמכה?'}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setDeleteTargetId(null)}>
              ביטול
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (deleteTargetId) {
                  void onDelete(deleteTargetId)
                }
              }}
              disabled={pendingDeleteId !== null && pendingDeleteId !== deleteTargetId}
              loading={pendingDeleteId === deleteTargetId}
            >
              אישור / מחיקה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ContentContainer className="space-y-5 pb-10">
        {deleteError ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {deleteError}
          </div>
        ) : null}

        {qualificationsQuery.isPending && !qualificationsQuery.data ? (
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
                    <TableHead>{renderSortButton('name')}</TableHead>
                    <TableHead>{renderSortButton('description')}</TableHead>
                    <TableHead className="w-32">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageQualifications.length > 0 ? (
                    pageQualifications.map((qualification) => (
                      <TableRow key={qualification.id}>
                        <TableCell>{qualification.name}</TableCell>
                        <TableCell>{qualification.description ?? '—'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TooltipProvider delayDuration={100}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    aria-label={`עריכת ${qualification.name}`}
                                    onClick={() => navigate(`/qualifications/${qualification.id}/edit`)}
                                  >
                                    <Pencil className="h-4 w-4" aria-hidden="true" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">עריכה</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    aria-label={`מחיקת ${qualification.name}`}
                                    onClick={() => setDeleteTargetId(qualification.id)}
                                    disabled={deleteInFlight}
                                  >
                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">מחיקה</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
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

            <Pagination
              page={boundedPage}
              pageSize={currentPageSize}
              total={total}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={(nextPage) => setPage(nextPage)}
              onPageSizeChange={(nextPageSize) => handlePageSizeChange(nextPageSize)}
              isLoading={qualificationsQuery.isFetching}
            />
          </>
        )}
      </ContentContainer>
    </>
  )
}
