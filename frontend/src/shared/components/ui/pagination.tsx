import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

export type PaginationProps = {
  page: number
  pageSize: number
  total: number
  pageSizeOptions?: number[]
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  isLoading?: boolean
  className?: string
  showCurrentPage?: boolean
}

export function Pagination({
  page,
  pageSize,
  total,
  pageSizeOptions = [10, 25, 50],
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  className,
  showCurrentPage = true,
}: PaginationProps) {
  const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize)
  const safePage = Math.min(Math.max(page, 1), totalPages)
  const rangeStart = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const rangeEnd = total === 0 ? 0 : Math.min(safePage * pageSize, total)
  const hasRecords = total > 0

  return (
    <div className={cn('flex flex-col gap-3 rounded-lg border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        {hasRecords ? <span>{`מציג ${rangeStart}–${rangeEnd} מתוך ${total} רשומות`}</span> : <span>אין רשומות להצגה</span>}
        {isLoading ? <span className="text-xs text-muted">מעדכן...</span> : null}
        {showCurrentPage && totalPages > 1 ? <span className="text-xs text-muted">עמוד {safePage} מתוך {totalPages}</span> : null}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <label className="flex items-center gap-2 text-sm text-muted">
          <span>מספר רשומות</span>
          <select
            aria-label="מספר רשומות לעמוד"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="rounded-md border border-border bg-background px-2 py-1 text-right text-foreground"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(Math.max(1, safePage - 1))}
            disabled={safePage <= 1 || isLoading || !hasRecords}
          >
            הקודם
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
            disabled={safePage >= totalPages || isLoading || !hasRecords}
          >
            הבא
          </Button>
        </div>
      </div>
    </div>
  )
}
