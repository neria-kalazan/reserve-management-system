import { TriangleAlert } from 'lucide-react'
import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { ApiError } from '@/api/client'
import { ContentContainer } from '@/app/layout/content-container'
import { PageHeader } from '@/app/layout/page-header'
import {
  useActivityById,
  useActivityPersonnelStatusMatrix,
  useCreateActivityUserStatus,
  useDeleteActivityUserStatus,
  useUpdateActivityUserStatus,
} from '@/features/activities/queries/use-activities'
import type {
  ActivityPersonnelStatusCellValue,
  ActivityPersonnelStatusDailySummary,
  ActivityPersonnelStatusMatrixRow,
  DailyStatus,
} from '@/features/activities/types/activity'
import { ErrorState } from '@/shared/components/error-state'
import { LoadingState } from '@/shared/components/loading-state'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { cn } from '@/shared/utils/cn'

const dateFormatter = new Intl.DateTimeFormat('he-IL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

const shortDateFormatter = new Intl.DateTimeFormat('he-IL', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'UTC',
})

const weekdayFormatter = new Intl.DateTimeFormat('he-IL', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  timeZone: 'UTC',
})

const statusMeta: Record<DailyStatus, { label: string; shortLabel: string; className: string }> = {
  ACTIVE: { label: 'פעיל', shortLabel: 'פ', className: 'border-success/30 bg-success-soft text-success' },
  HOLIDAY: { label: 'חופשה', shortLabel: 'ח', className: 'border-warning/30 bg-warning-soft text-warning' },
  RELEASED: { label: 'שוחרר', shortLabel: 'ש', className: 'border-info/30 bg-info-soft text-info' },
  SICK: { label: 'חולה', shortLabel: 'ג', className: 'border-danger/30 bg-danger-soft text-danger' },
}

const statusColumnBackgroundClassName: Record<DailyStatus, string> = {
  ACTIVE: 'bg-success-soft/20 text-success',
  HOLIDAY: 'bg-warning-soft/20 text-warning',
  RELEASED: 'bg-info-soft/20 text-info',
  SICK: 'bg-danger-soft/20 text-danger',
}

const statusTextClassName: Record<DailyStatus, string> = {
  ACTIVE: 'text-success',
  HOLIDAY: 'text-warning',
  RELEASED: 'text-info',
  SICK: 'text-danger',
}

const getUtcDateKey = (date: Date) => date.toISOString().slice(0, 10)

const isApiError = (value: unknown): value is ApiError => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    typeof (value as { status?: unknown }).status === 'number'
  )
}

const isSaturday = (dateKey: string) => new Date(`${dateKey}T00:00:00Z`).getUTCDay() === 6

const formatDateRange = (startDate?: string, endDate?: string) => {
  if (!startDate || !endDate) {
    return 'לא זמין'
  }

  return `${dateFormatter.format(new Date(startDate))} – ${dateFormatter.format(new Date(endDate))}`
}

const getUserDisplayName = (user: { firstName?: string | null; lastName?: string | null; email?: string | null; id: string }) => {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  return name || user.email || user.id
}

const MatrixStatusCell = memo(function MatrixStatusCell({
  value,
  userId,
  dateKey,
  isEditing,
  onEditStart,
  onEditStop,
  createMutation,
  updateMutation,
  deleteMutation,
}: {
  value: ActivityPersonnelStatusCellValue
  userId: string
  dateKey: string
  isEditing: boolean
  onEditStart: () => void
  onEditStop: () => void
  createMutation: ReturnType<typeof useCreateActivityUserStatus>
  updateMutation: ReturnType<typeof useUpdateActivityUserStatus>
  deleteMutation: ReturnType<typeof useDeleteActivityUserStatus>
}) {
  const selectValue = value ?? 'NONE'
  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  const handleValueChange = useCallback(
    async (nextValue: string) => {
      if (isMutating) {
        return
      }

      try {
        if (nextValue === 'NONE') {
          if (value) {
            await deleteMutation.mutateAsync({ userId, date: dateKey })
          }
          return
        }

        const nextStatus = nextValue as DailyStatus

        if (!value) {
          await createMutation.mutateAsync({ userId, date: dateKey, status: nextStatus })
          return
        }

        if (value !== nextStatus) {
          await updateMutation.mutateAsync({ userId, date: dateKey, status: nextStatus })
        }
      } finally {
        onEditStop()
      }
    },
    [createMutation, dateKey, deleteMutation, isMutating, onEditStop, updateMutation, userId, value],
  )

  if (!isEditing) {
    return (
      <button
        type="button"
        className={cn(
          'flex h-6 w-6 min-w-0 items-center justify-center rounded-sm border px-0 py-0 text-center text-[11px] font-bold transition-colors',
          value ? statusMeta[value].className : 'border-dashed border-border bg-transparent text-muted',
        )}
        aria-label={`סטטוס עבור ${userId} בתאריך ${dateKey}`}
        onClick={() => !isMutating && onEditStart()}
        disabled={isMutating}
      >
        <span className="flex w-full items-center justify-center leading-none">{value ? statusMeta[value].shortLabel : '-'}</span>
      </button>
    )
  }

  return (
    <Select value={selectValue} onValueChange={handleValueChange} disabled={isMutating} open onOpenChange={(open) => !open && onEditStop()}>
      <SelectTrigger
        className={cn(
          'h-6 w-6 min-w-0 rounded-sm border px-0 py-0 text-center text-[11px] font-bold [&>svg]:hidden',
          value ? statusMeta[value].className : 'border-dashed border-border bg-transparent text-muted',
        )}
        aria-label={`סטטוס עבור ${userId} בתאריך ${dateKey}`}
      >
        <span className="flex w-full items-center justify-center leading-none">{value ? statusMeta[value].shortLabel : '-'}</span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="NONE">ללא</SelectItem>
        {(Object.keys(statusMeta) as DailyStatus[]).map((status) => (
          <SelectItem key={status} value={status}>
            {statusMeta[status].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
})

MatrixStatusCell.displayName = 'MatrixStatusCell'

const MatrixRow = memo(function MatrixRow({
  row,
  dates,
  editingCellKey,
  setEditingCellKey,
  createStatusMutation,
  updateStatusMutation,
  deleteStatusMutation,
}: {
  row: ActivityPersonnelStatusMatrixRow
  dates: string[]
  editingCellKey: string | null
  setEditingCellKey: React.Dispatch<React.SetStateAction<string | null>>
  createStatusMutation: ReturnType<typeof useCreateActivityUserStatus>
  updateStatusMutation: ReturnType<typeof useUpdateActivityUserStatus>
  deleteStatusMutation: ReturnType<typeof useDeleteActivityUserStatus>
}) {
  const createEditStartHandler = useCallback(
    (cellKey: string) => () => setEditingCellKey(cellKey),
    [setEditingCellKey],
  )

  const createEditStopHandler = useCallback(
    (cellKey: string) => () => setEditingCellKey((current) => (current === cellKey ? null : current)),
    [setEditingCellKey],
  )

  return (
    <TableRow
      key={row.user.id}
      className={cn('group align-middle', row.summary.complete ? 'bg-success-soft/10' : 'bg-warning-soft/5')}
      data-complete={row.summary.complete ? 'true' : 'false'}
    >
      <TableCell className="sticky right-0 z-30 min-w-[100px] border-l border-border bg-surface px-2 text-right shadow-sm group-hover:bg-surface-elevated">
        <div className="flex min-w-0 items-center gap-1.5">
          <div className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-medium text-foreground">
              {getUserDisplayName(row.user)}
            </span>
            <span className="block text-[10px] text-muted">{row.user.personalNumber ?? row.user.email ?? row.user.id}</span>
          </div>
          {!row.summary.complete ? (
            <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-warning" aria-label="אזהרה: לא מלא" />
          ) : null}
        </div>
      </TableCell>

      {dates.map((dateKey) => {
        const cellKey = `${row.user.id}:${dateKey}`
        const isEditingCell = editingCellKey === cellKey

        return (
          <TableCell
            key={`${row.user.id}-${dateKey}`}
            className={cn(
              'border-l border-border bg-surface px-1 py-1 text-center group-hover:bg-inherit',
              isSaturday(dateKey) && 'bg-warning-soft/10',
            )}
          >
            <MatrixStatusCell
              value={row.cells[dateKey] ?? null}
              userId={row.user.id}
              dateKey={dateKey}
              isEditing={isEditingCell}
              onEditStart={createEditStartHandler(cellKey)}
              onEditStop={createEditStopHandler(cellKey)}
              createMutation={createStatusMutation}
              updateMutation={updateStatusMutation}
              deleteMutation={deleteStatusMutation}
            />
          </TableCell>
        )
      })}

      {[
        { value: row.summary.activeCount, className: 'bg-success-soft/20 text-success', status: 'ACTIVE' as const },
        { value: row.summary.holidayCount, className: 'bg-warning-soft/20 text-warning', status: 'HOLIDAY' as const },
        { value: row.summary.sickCount, className: 'bg-danger-soft/20 text-danger', status: 'SICK' as const },
        { value: row.summary.releasedCount, className: 'bg-info-soft/20 text-info', status: 'RELEASED' as const },
        { value: row.summary.yamam, className: 'bg-surface', status: null },
      ].map((summaryCell, index) => (
        <TableCell
          key={`${row.user.id}-summary-${index}`}
          className={cn(
            'w-[52px] min-w-[52px] border-l border-border px-1 py-1 text-center text-[11px] font-semibold group-hover:bg-inherit',
            summaryCell.className,
          )}
        >
          {summaryCell.value}
        </TableCell>
      ))}
    </TableRow>
  )
})

MatrixRow.displayName = 'MatrixRow'

function ActivityPersonnelStatusMatrixPage() {
  const navigate = useNavigate()
  const { activityId } = useParams<{ activityId: string }>()
  const [editingCellKey, setEditingCellKey] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const activityQuery = useActivityById(activityId)
  const matrixQuery = useActivityPersonnelStatusMatrix(activityId)

  useLayoutEffect(() => {
    if (!activityQuery.data || activityQuery.data.status !== 'ACTIVE' || !matrixQuery.data) {
      return
    }

    const todayDateKey = getUtcDateKey(new Date())
    const todayIndex = matrixQuery.data.dates.indexOf(todayDateKey)
    if (todayIndex === -1) {
      return
    }

    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      const table = scrollContainer.querySelector('table')
      if (!table) {
        return
      }

      const targetCell = table.querySelectorAll('thead tr th')[todayIndex + 1] as HTMLElement | null
      if (!targetCell) {
        return
      }

      targetCell.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [activityQuery.data, matrixQuery.data])
  const createStatusMutation = useCreateActivityUserStatus(activityId)
  const updateStatusMutation = useUpdateActivityUserStatus(activityId)
  const deleteStatusMutation = useDeleteActivityUserStatus(activityId)

  const dailySummaryLookup = useMemo(() => {
    const map = new Map<string, ActivityPersonnelStatusDailySummary>()
    for (const item of matrixQuery.data?.dailySummary ?? []) {
      map.set(item.date, item)
    }
    return map
  }, [matrixQuery.data?.dailySummary])

  const summaryCards = useMemo(() => {
    if (!matrixQuery.data) {
      return []
    }

    return [
      { label: 'חיילים', value: String(matrixQuery.data.rows.length) },
      { label: 'ימים', value: String(matrixQuery.data.dates.length) },
      { label: 'טווח תאריכים', value: formatDateRange(matrixQuery.data.activity.startDate, matrixQuery.data.activity.endDate) },
    ]
  }, [matrixQuery.data])

  if (!activityId) {
    return (
      <>
        <PageHeader title="טבלת נוכחות" description="לא התקבל מזהה פעילות חוקי." />
        <ContentContainer className="pb-10">
          <ErrorState
            title="מזהה פעילות חסר"
            description="לא ניתן לטעון את טבלת הנוכחות בלי מזהה תקין."
            action={
              <Button type="button" variant="secondary" onClick={() => navigate('/activities')}>
                חזרה לרשימת פעילויות
              </Button>
            }
          />
        </ContentContainer>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={activityQuery.data?.name ?? 'טבלת נוכחות'}
        description={activityQuery.data ? `${formatDateRange(activityQuery.data.startDate, activityQuery.data.endDate)}` : 'מעקב נוכחות לפי תאריכים.'}
        actions={
          <Button type="button" variant="secondary" onClick={() => navigate(`/activities/${activityId}`)}>
            חזרה לפרטי פעילות
          </Button>
        }
      />

      <ContentContainer className="space-y-5 pb-10">
        {activityQuery.isPending || matrixQuery.isPending ? (
          <LoadingState title="טוען טבלת נוכחות" description="נתוני הפעילות והסטטוסים נטענים כעת." />
        ) : activityQuery.isError || matrixQuery.isError ? (
          <ErrorState
            title={activityQuery.isError && isApiError(activityQuery.error) && activityQuery.error.status === 404 ? 'הפעילות לא נמצאה' : 'טעינת טבלת הנוכחות נכשלה'}
            description={
              activityQuery.isError && isApiError(activityQuery.error) && activityQuery.error.status === 404
                ? 'לא נמצאה פעילות עם המזהה שנבחר. אפשר לחזור לרשימת הפעילויות.'
                : 'לא הצלחנו לטעון את טבלת הנוכחות. אפשר לנסות שוב.'
            }
            action={
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  void activityQuery.refetch()
                  void matrixQuery.refetch()
                }}
              >
                ניסיון חוזר
              </Button>
            }
          />
        ) : !matrixQuery.data ? (
          <ErrorState title="אין נתוני נוכחות" description="לא התקבלו נתונים עבור פעילות זו." />
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              {summaryCards.map((card) => (
                <div key={card.label} className="rounded-lg border border-border bg-surface px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted">{card.label}</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{card.value}</p>
                </div>
              ))}
            </div>

            <Card>
              <CardHeader className="px-4 py-4 sm:px-5">
                <CardTitle className="text-base">נוכחות</CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0 sm:px-0 sm:pb-0">
                  <Table scrollContainerRef={scrollContainerRef} className="min-w-[900px] border-separate border-spacing-0">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky right-0 z-30 min-w-[100px] border-l border-border bg-surface px-3 text-center shadow-sm">
                          שם החייל
                        </TableHead>
                        {matrixQuery.data.dates.map((dateKey) => {
                          const date = new Date(`${dateKey}T00:00:00Z`)
                          const isSaturdayDate = date.getUTCDay() === 6

                          return (
                            <TableHead
                              key={dateKey}
                              className={cn(
                                'w-[42px] min-w-[42px] border-l border-border bg-surface px-1 text-center align-top',
                                isSaturdayDate && 'bg-warning-soft/20 text-warning',
                              )}
                            >
                              <div className="space-y-0.5">
                                <div className="text-[8px] font-medium uppercase tracking-wide text-muted">
                                  {new Intl.DateTimeFormat('he-IL', { weekday: 'short' }).format(date)}
                                </div>
                                <div className="text-[9px] font-medium text-foreground">
                                  {shortDateFormatter.format(date)}
                                </div>
                              </div>
                            </TableHead>
                          )
                        })}
                        <TableHead className={cn('w-[52px] min-w-[52px] border-l border-border px-1 text-center text-[9px]', statusColumnBackgroundClassName.ACTIVE)}>פעיל</TableHead>
                        <TableHead className={cn('w-[52px] min-w-[52px] border-l border-border px-1 text-center text-[9px]', statusColumnBackgroundClassName.HOLIDAY)}>חופשה</TableHead>
                        <TableHead className={cn('w-[52px] min-w-[52px] border-l border-border px-1 text-center text-[9px]', statusColumnBackgroundClassName.SICK)}>חולה</TableHead>
                        <TableHead className={cn('w-[52px] min-w-[52px] border-l border-border px-1 text-center text-[9px]', statusColumnBackgroundClassName.RELEASED)}>שוחרר</TableHead>
                        <TableHead className="w-[52px] min-w-[52px] border-l border-border bg-surface px-1 text-center text-[9px] text-foreground">ימ"מ</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {matrixQuery.data.rows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={matrixQuery.data.dates.length + 6} className="py-10 text-center text-muted">
                            אין משתמשים פעילים להצגה.
                          </TableCell>
                        </TableRow>
                      ) : (
                        matrixQuery.data.rows.map((row) => (
                          <MatrixRow
                            key={row.user.id}
                            row={row}
                            dates={matrixQuery.data.dates}
                            editingCellKey={editingCellKey}
                            setEditingCellKey={setEditingCellKey}
                            createStatusMutation={createStatusMutation}
                            updateStatusMutation={updateStatusMutation}
                            deleteStatusMutation={deleteStatusMutation}
                          />
                        ))
                      )}

                      <TableRow className="bg-surface-elevated">
                        <TableCell className="sticky right-0 z-30 min-w-[100px] border-l border-border bg-surface-elevated px-2 text-right font-semibold text-foreground shadow-sm">
                          סיכום יומי
                        </TableCell>
                        {matrixQuery.data.dates.map((dateKey) => {
                          const summary = dailySummaryLookup.get(dateKey)
                          return (
                            <TableCell key={`summary-${dateKey}`} className="border-l border-border bg-surface-elevated px-1 py-1 text-center text-[10px]">
                              <div className="space-y-0.5">
                                <div className={statusTextClassName.ACTIVE}>פ {summary?.activeCount ?? 0}</div>
                                <div className={statusTextClassName.HOLIDAY}>ח {summary?.holidayCount ?? 0}</div>
                                <div className={statusTextClassName.SICK}>ג {summary?.sickCount ?? 0}</div>
                                <div className={statusTextClassName.RELEASED}>ש {summary?.releasedCount ?? 0}</div>
                              </div>
                            </TableCell>
                          )
                        })}
                        {[
                          { value: matrixQuery.data.dailySummary.reduce((sum, item) => sum + item.activeCount, 0), label: 'פעיל' },
                          { value: matrixQuery.data.dailySummary.reduce((sum, item) => sum + item.holidayCount, 0), label: 'חופשה' },
                          { value: matrixQuery.data.dailySummary.reduce((sum, item) => sum + item.sickCount, 0), label: 'חולה' },
                          { value: matrixQuery.data.dailySummary.reduce((sum, item) => sum + item.releasedCount, 0), label: 'שוחרר' },
                          { value: matrixQuery.data.dailySummary.reduce((sum, item) => sum + item.yamam, 0), label: 'ימ"מ' },
                        ].map((summaryCell, index) => (
                          <TableCell key={`daily-total-${index}`} className="w-[52px] min-w-[52px] border-l border-border bg-surface-elevated px-1 py-1 text-center text-[11px] font-semibold text-foreground">
                            {summaryCell.value}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
              </CardContent>
            </Card>
          </>
        )}
      </ContentContainer>
    </>
  )
}

export { ActivityPersonnelStatusMatrixPage }
