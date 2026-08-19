import { useMemo, useRef, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useAuthSession } from '@/app/auth/use-auth-session'
import { ContentContainer } from '@/app/layout/content-container'
import { PageHeader } from '@/app/layout/page-header'
import { type UserImportResult } from '@/features/users/api/users'
import { useCompanyUsers, useDeactivateUser, useImportCompanyUsers } from '@/features/users/queries/use-users'
import { ErrorState } from '@/shared/components/error-state'
import { LoadingState } from '@/shared/components/loading-state'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Pagination } from '@/shared/components/ui/pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip'

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const
const SORTABLE_COLUMNS = ['unitDisplayOrder', 'firstName', 'lastName', 'personalNumber', 'phone'] as const

type SortField = (typeof SORTABLE_COLUMNS)[number]
type SortOrder = 'asc' | 'desc'

export function UsersPage() {
  const navigate = useNavigate()
  const { user } = useAuthSession()
  const companyId = user?.companyId

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(10)
  const [sortBy, setSortBy] = useState<SortField>('unitDisplayOrder')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const usersQuery = useCompanyUsers(companyId, { page, pageSize, sortBy, sortOrder })
  const importUsersMutation = useImportCompanyUsers()
  const deactivateUserMutation = useDeactivateUser()
  const deactivateInFlight = deactivateUserMutation?.isPending ?? false
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<UserImportResult | null>(null)
  const [pendingDeactivateId, setPendingDeactivateId] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deactivateError, setDeactivateError] = useState<string | null>(null)

  const users = usersQuery.data?.items ?? []
  const total = usersQuery.data?.total ?? 0
  const currentPageSize = usersQuery.data?.pageSize ?? pageSize
  const totalPages = total === 0 ? 1 : Math.ceil(total / currentPageSize)
  const boundedPage = Math.min(Math.max(page, 1), totalPages)
  const hasRecords = total > 0

  const pageUsers = useMemo(() => users, [users])

  const formatRoleSummary = (values: Array<{ name: string }>) => {
    if (values.length === 0) {
      return '—'
    }

    if (values.length === 1) {
      return values[0].name
    }

    if (values.length === 2) {
      return `${values[0].name}, ${values[1].name}`
    }

    return `${values[0].name}, ${values[1].name} • +${values.length - 2}`
  }

  const formatQualificationSummary = (values: Array<{ name: string }>) => {
    if (values.length === 0) {
      return '—'
    }

    if (values.length === 1) {
      return values[0].name
    }

    return `${values[0].name} • +${values.length - 1}`
  }

  const CompactValueList = ({ values, emptyText = '—', kind = 'role' }: { values: Array<{ name: string }>; emptyText?: string; kind?: 'role' | 'qualification' }) => {
    const [isOpen, setIsOpen] = useState(false)

    if (values.length === 0) {
      return <span className="text-muted">{emptyText}</span>
    }

    if (kind === 'role') {
      return (
        <div className="flex flex-wrap gap-1">
          {values.map((value) => (
            <Badge key={`${value.name}-${value.name}`} className="border-border bg-surface-elevated text-foreground">
              {value.name}
            </Badge>
          ))}
        </div>
      )
    }

    const summary = formatQualificationSummary(values)
    const shouldUseTooltip = values.length > 1

    if (!shouldUseTooltip) {
      return (
        <div className="flex flex-wrap gap-1">
          {values.map((value) => (
            <Badge key={`${value.name}-${value.name}`} className="border-border bg-surface-elevated text-foreground">
              {value.name}
            </Badge>
          ))}
        </div>
      )
    }

    return (
      <Tooltip open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger asChild>
          <button type="button" onClick={() => setIsOpen((current) => !current)} className="inline-flex max-w-full cursor-pointer text-left">
            <Badge className="border-border bg-surface-elevated text-foreground">{summary}</Badge>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="flex flex-wrap gap-1">
            {values.map((value, index) => (
              <Badge key={`${value.name}-${index}`} className="border-border bg-surface-elevated text-foreground">
                {value.name}
              </Badge>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

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

  const handleImportClick = () => {
    setImportError(null)
    fileInputRef.current?.click()
  }

  const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    event.target.value = ''

    if (!selectedFile) {
      setImportError('לא נבחר קובץ לייבוא.')
      return
    }

    const isCsvFile = selectedFile.name.toLowerCase().endsWith('.csv') || selectedFile.type.includes('csv')
    if (!isCsvFile) {
      setImportError('קובץ לא תקין. בחר קובץ CSV בלבד.')
      return
    }

    try {
      const result = await importUsersMutation.mutateAsync(selectedFile)
      setImportResult(result)
      setImportError(null)
    } catch (error: unknown) {
      const message = error instanceof Error && error.message ? error.message : 'הייבוא נכשל. נסה שוב.'
      setImportError(message)
      setImportResult(null)
    }
  }

  const onDeactivate = async (userId: string) => {
    setPendingDeactivateId(userId)
    setDeactivateError(null)

    try {
      await deactivateUserMutation.mutateAsync(userId)
      setPendingDeactivateId(null)
      setDeleteTargetId(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'לא הצלחנו להפסיק את פעילות האדם.'
      setDeactivateError(message)
      setPendingDeactivateId(null)
    }
  }

  const deleteTarget = deleteTargetId ? users.find((user) => user.id === deleteTargetId) ?? null : null

  const getSortIndicator = (field: SortField) => {
    if (sortBy !== field) {
      return null
    }

    return sortOrder === 'asc' ? '↑' : '↓'
  }

  const getColumnLabel = (field: SortField) => {
    const labels: Record<SortField, string> = {
      unitDisplayOrder: 'מסגרת',
      firstName: 'שם',
      lastName: 'משפחה',
      personalNumber: 'מספר אישי',
      phone: 'טלפון',
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
    <TooltipProvider>
      <PageHeader
        title="כוח אדם"
        description="רשימת אנשי הפלוגה עם פרטים בסיסיים ומיקום במסגרות."
        actions={
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={handleImportClick} disabled={importUsersMutation.isPending}>
              {importUsersMutation.isPending ? 'מייבא...' : 'ייבוא כוח אדם'}
            </Button>
            <Button type="button" onClick={() => navigate('/users/new')}>
              חייל חדש
            </Button>
          </div>
        }
      />

      <Dialog open={Boolean(deleteTargetId)} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>אישור מחיקה</DialogTitle>
            <DialogDescription>
              {deleteTarget ? `האם להפסיק את פעילותו של ${deleteTarget.firstName} ${deleteTarget.lastName}?` : 'האם להפסיק את פעילותו?'}
            </DialogDescription>
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
                  void onDeactivate(deleteTargetId)
                }
              }}
              disabled={pendingDeactivateId !== null && pendingDeactivateId !== deleteTargetId}
              loading={pendingDeactivateId === deleteTargetId}
            >
              אישור / מחיקה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleImportFileChange}
      />

      <ContentContainer className="space-y-5 pb-10">
        {importError ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {importError}
          </div>
        ) : null}

        {deactivateError ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {deactivateError}
          </div>
        ) : null}

        {importResult ? (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <div className="font-medium">
              ייבוא הושלם: {importResult.created} נוספו, {importResult.failed} נכשלו.
            </div>
            {importResult.failed > 0 && importResult.errors.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {importResult.errors.map((error) => (
                  <li key={`${error.row}-${error.reason}`}>
                    שורה {error.row}: {error.reason}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {usersQuery.isPending && !usersQuery.data ? (
          <LoadingState title="טוען כוח אדם" description="רשימת אנשי הפלוגה נטענת כעת." />
        ) : usersQuery.isError ? (
          <ErrorState
            title="טעינת כוח אדם נכשלה"
            description="לא הצלחנו לטעון את רשימת אנשי הפלוגה. אפשר לנסות שוב."
            action={
              <Button type="button" variant="secondary" onClick={() => void usersQuery.refetch()}>
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
                    <TableHead>{renderSortButton('firstName')}</TableHead>
                    <TableHead>{renderSortButton('lastName')}</TableHead>
                    <TableHead>{renderSortButton('personalNumber')}</TableHead>
                    <TableHead>{renderSortButton('unitDisplayOrder')}</TableHead>
                    <TableHead>תפקידים</TableHead>
                    <TableHead>הסמכות</TableHead>
                    <TableHead>{renderSortButton('phone')}</TableHead>
                    <TableHead>דוא"ל</TableHead>
                    <TableHead className="w-36">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageUsers.length > 0 ? (
                    pageUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.firstName}</TableCell>
                        <TableCell>{user.lastName}</TableCell>
                        <TableCell>{user.personalNumber}</TableCell>
                        <TableCell>{user.unit?.name ?? '—'}</TableCell>
                        <TableCell>
                          <CompactValueList values={user.roles ?? []} kind="role" />
                        </TableCell>
                        <TableCell>
                          <CompactValueList values={user.qualifications ?? []} kind="qualification" />
                        </TableCell>
                        <TableCell>{user.phone ?? '—'}</TableCell>
                        <TableCell>{user.email ?? '—'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TooltipProvider delayDuration={100}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    aria-label={`עריכת ${user.firstName} ${user.lastName}`}
                                    onClick={() => navigate(`/users/${user.id}/edit`)}
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
                                    aria-label={`הפסקת פעילות של ${user.firstName} ${user.lastName}`}
                                    onClick={() => setDeleteTargetId(user.id)}
                                    disabled={deactivateInFlight}
                                  >
                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">הפסק פעילות</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="py-10 text-center text-muted">
                        אין אנשי צוות להצגה
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
              isLoading={usersQuery.isFetching}
            />
          </>
        )}
      </ContentContainer>
    </TooltipProvider>
  )
}
