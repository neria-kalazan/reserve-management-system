import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { ApiError } from '@/api/client'
import type {
  SchedulingDayCandidateEvaluationReason,
  SchedulingDayTaskInstance,
} from '@/features/activities/api/scheduling-day'
import { ContentContainer } from '@/app/layout/content-container'
import { PageHeader } from '@/app/layout/page-header'
import { useActivityById } from '@/features/activities/queries/use-activities'
import { useActivitySchedulingDay } from '@/features/activities/queries/use-activity-scheduling-day'
import {
  useActivityTasks,
  useCreateActivityTaskInstance,
  useCreateTaskInstanceAssignment,
  useDeleteActivityTaskInstance,
  useDeleteAssignment,
  useUpdateActivityTaskInstance,
} from '@/features/activities/queries/use-activity-tasks'
import { useCompanyUsers } from '@/features/users/queries/use-users'
import type { CompanyUser } from '@/features/users/api/users'
import { EmptyState } from '@/shared/components/empty-state'
import { ErrorState } from '@/shared/components/error-state'
import { LoadingState } from '@/shared/components/loading-state'
import { StatusBadge, ValidationBadge } from '@/shared/components/status-badge'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'

const dateFormatter = new Intl.DateTimeFormat('he-IL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

const weekdayFormatter = new Intl.DateTimeFormat('he-IL', {
  weekday: 'long',
  timeZone: 'UTC',
})

const timeFormatter = new Intl.DateTimeFormat('he-IL', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
})

const isApiError = (value: unknown): value is ApiError => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    typeof (value as { status?: unknown }).status === 'number'
  )
}

const formatDate = (value: string) => dateFormatter.format(new Date(value))
const formatTime = (value: string) => timeFormatter.format(new Date(value))
const formatUserName = (user: Pick<CompanyUser, 'firstName' | 'lastName'>) => `${user.firstName} ${user.lastName}`.trim()
const getMutationErrorMessage = (error: unknown, fallbackMessage: string) =>
  isApiError(error) ? error.message : fallbackMessage

const formatSelectedDay = (dateKey: string) => {
  const date = new Date(`${dateKey}T00:00:00.000Z`)
  return `${weekdayFormatter.format(date)} ${dateFormatter.format(date)}`
}

const toDateKey = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return undefined
  }

  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const clampDateKeyToRange = (dateKey: string, startDateKey: string, endDateKey: string) => {
  if (dateKey < startDateKey) {
    return startDateKey
  }

  if (dateKey > endDateKey) {
    return endDateKey
  }

  return dateKey
}

const addUtcDays = (dateKey: string, amount: number) => {
  const date = new Date(`${dateKey}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + amount)
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const toDateTimeInputValue = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

interface TaskInstanceEditorState {
  mode: 'create' | 'edit'
  taskInstanceId?: string
  activityTaskId: string
  title: string
  startTime: string
  endTime: string
}

const createDefaultTaskInstanceState = (
  selectedDate: string,
  activityTaskId: string,
  title = '',
): TaskInstanceEditorState => ({
  mode: 'create',
  activityTaskId,
  title,
  startTime: `${selectedDate}T08:00`,
  endTime: `${selectedDate}T16:00`,
})

const requirementBadgeClassName = (required: boolean) =>
  required
    ? 'border-danger/30 bg-danger-soft text-danger'
    : 'border-info/30 bg-info-soft text-info'

const getValidationBadgeText = (taskInstance: SchedulingDayTaskInstance) => {
  if (taskInstance.validation.requiredErrors.length > 0) {
    return `${taskInstance.validation.requiredErrors.length} בעיות חובה`
  }

  if (taskInstance.validation.warnings.length > 0) {
    return `${taskInstance.validation.warnings.length} אזהרות`
  }

  return 'תקין'
}

const getEvaluationBadgeClassName = (severity: 'NORMAL' | 'WARNING' | 'CRITICAL') => {
  if (severity === 'CRITICAL') {
    return 'border-danger/30 bg-danger-soft text-danger'
  }

  if (severity === 'WARNING') {
    return 'border-warning/30 bg-warning-soft text-warning'
  }

  return 'border-success/30 bg-success-soft text-success'
}

const getEvaluationBadgeText = (severity: 'NORMAL' | 'WARNING' | 'CRITICAL') => {
  if (severity === 'CRITICAL') {
    return 'קריטי'
  }

  if (severity === 'WARNING') {
    return 'אזהרה'
  }

  return 'תקין'
}

const getEvaluationState = (severity: 'NORMAL' | 'WARNING' | 'CRITICAL') => {
  if (severity === 'CRITICAL') {
    return 'error'
  }

  if (severity === 'WARNING') {
    return 'warning'
  }

  return 'valid'
}

const formatEvaluationReason = (reason: SchedulingDayCandidateEvaluationReason) => {
  if (reason.roleName) {
    return `${reason.message}: ${reason.roleName}`
  }

  if (reason.qualificationName) {
    return `${reason.message}: ${reason.qualificationName}`
  }

  return reason.message
}

function AssignmentSlotCard({
  taskInstance,
  slotIndex,
  activityId,
  selectedDate,
  companyUsers,
  isUsersPending,
  isUsersError,
  onRetryUsers,
  onRefreshDay,
}: {
  taskInstance: SchedulingDayTaskInstance
  slotIndex: number
  activityId: string
  selectedDate: string
  companyUsers: CompanyUser[]
  isUsersPending: boolean
  isUsersError: boolean
  onRetryUsers: () => void
  onRefreshDay: () => Promise<unknown>
}) {
  const assignment = taskInstance.assignments[slotIndex]
  const [searchText, setSearchText] = useState('')
  const [assignmentError, setAssignmentError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const schedulingScope = { activityId, date: selectedDate }
  const createAssignmentMutation = useCreateTaskInstanceAssignment(taskInstance.id, schedulingScope)
  const deleteAssignmentMutation = useDeleteAssignment(schedulingScope)
  const replaceDeleteAssignmentMutation = useDeleteAssignment()

  const matchingUsers = useMemo(() => {
    const normalizedSearch = searchText.trim().toLocaleLowerCase()
    if (normalizedSearch.length === 0) {
      return []
    }

    return companyUsers
      .filter((user) => user.id !== assignment?.userId)
      .filter((user) => {
        const candidateText = [user.firstName, user.lastName, user.email, user.phone, user.personalNumber]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase()

        return candidateText.includes(normalizedSearch)
      })
      .slice(0, 6)
  }, [assignment?.userId, companyUsers, searchText])

  const hasSearchText = searchText.trim().length > 0
  const isBusy =
    isSubmitting ||
    createAssignmentMutation.isPending ||
    deleteAssignmentMutation.isPending ||
    replaceDeleteAssignmentMutation.isPending

  const assignUser = async (userId: string) => {
    if (isBusy) {
      return
    }

    setAssignmentError(null)
    setIsSubmitting(true)

    let removedExistingAssignment = false

    try {
      if (assignment) {
        await replaceDeleteAssignmentMutation.mutateAsync(assignment.id)
        removedExistingAssignment = true
      }

      await createAssignmentMutation.mutateAsync({ userId })
      setSearchText('')
    } catch (error) {
      if (removedExistingAssignment) {
        await onRefreshDay()
      }

      setAssignmentError(getMutationErrorMessage(error, 'שמירת השיבוץ נכשלה. אפשר לנסות שוב.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const removeAssignment = async () => {
    if (!assignment || isBusy) {
      return
    }

    setAssignmentError(null)
    setIsSubmitting(true)

    try {
      await deleteAssignmentMutation.mutateAsync(assignment.id)
      setSearchText('')
    } catch (error) {
      setAssignmentError(getMutationErrorMessage(error, 'מחיקת השיבוץ נכשלה. אפשר לנסות שוב.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!assignment) {
    return (
      <div data-testid={`planning-slot-${taskInstance.id}-${slotIndex}`} className="rounded-md border border-dashed border-border bg-surface px-3 py-3 text-right">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">מקום {slotIndex + 1}</p>
          <Badge className="border-border-strong bg-border text-muted-foreground">פנוי</Badge>
        </div>

        <div className="mt-3 space-y-2">
          <Label htmlFor={`planning-assignment-search-${taskInstance.id}-${slotIndex}`} className="text-xs text-muted">
            שיבוץ חייל למקום {slotIndex + 1}
          </Label>
          <Input
            id={`planning-assignment-search-${taskInstance.id}-${slotIndex}`}
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="חיפוש לפי שם או מספר אישי"
            disabled={isBusy || isUsersPending}
          />
        </div>

        {isUsersPending ? <p className="mt-2 text-xs text-muted">טוען חיילים…</p> : null}

        {isUsersError ? (
          <div className="mt-2 rounded-md border border-danger/30 bg-danger-soft/20 px-3 py-2 text-xs text-danger">
            <p>טעינת החיילים נכשלה.</p>
            <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={onRetryUsers}>
              ניסיון חוזר
            </Button>
          </div>
        ) : null}

        {!isUsersPending && !isUsersError && hasSearchText && matchingUsers.length === 0 ? (
          <p className="mt-2 text-xs text-muted">לא נמצאו חיילים התואמים את החיפוש.</p>
        ) : null}

        {matchingUsers.length > 0 ? (
          <div className="mt-2 space-y-2">
            {matchingUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                className="flex w-full items-center justify-between rounded-md border border-border bg-surface-elevated px-3 py-2 text-right text-sm text-foreground hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isBusy}
                onClick={() => void assignUser(user.id)}
              >
                <span className="min-w-0">
                  <span className="block font-medium">{formatUserName(user)}</span>
                  <span className="block text-xs text-muted">{user.personalNumber}</span>
                </span>
                <span className="text-xs text-muted">בחר</span>
              </button>
            ))}
          </div>
        ) : null}

        {assignmentError ? (
          <div className="mt-2 rounded-md border border-danger/30 bg-danger-soft/20 px-3 py-2 text-xs text-danger" role="alert">
            {assignmentError}
          </div>
        ) : null}
      </div>
    )
  }

  const userName = formatUserName(assignment.user)

  return (
    <div data-testid={`planning-slot-${taskInstance.id}-${slotIndex}`} className="rounded-md border border-border bg-surface px-3 py-3 text-right">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">מקום {slotIndex + 1}</p>
        <Badge className="border-success/30 bg-success-soft text-success">מאויש</Badge>
      </div>

      <div className="mt-2 space-y-1 text-sm text-foreground">
        <p className="font-medium">{userName}</p>
        <p className="text-xs text-muted">מספר אישי: {assignment.user.personalNumber}</p>
        {assignment.user.unit ? <p className="text-xs text-muted">מסגרת: {assignment.user.unit.name}</p> : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge className={assignment.user.isActive ? 'border-success/30 bg-success-soft text-success' : 'border-border-strong bg-border text-muted-foreground'}>
          {assignment.user.isActive ? 'פעיל' : 'לא פעיל'}
        </Badge>
        <ValidationBadge
          state={getEvaluationState(assignment.evaluation.severity)}
          text={getEvaluationBadgeText(assignment.evaluation.severity)}
        />
        {assignment.availability ? (
          <>
            <StatusBadge value={assignment.availability.status} />
            <StatusBadge value={assignment.availability.availability} />
          </>
        ) : null}
      </div>

      {assignment.evaluation.reasons.length > 0 ? (
        <Alert
          className={
            assignment.evaluation.severity === 'CRITICAL'
              ? 'mt-3 border-danger/30 bg-danger-soft/20 px-3 py-3'
              : 'mt-3 border-warning/30 bg-warning-soft/20 px-3 py-3'
          }
          data-testid={`planning-assignment-evaluation-${assignment.id}`}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 text-right">
              <AlertTitle className={assignment.evaluation.severity === 'CRITICAL' ? 'text-danger' : 'text-warning'}>
                {assignment.evaluation.severity === 'CRITICAL' ? 'התראת שיבוץ קריטית' : 'אזהרת שיבוץ'}
              </AlertTitle>
              <AlertDescription className={assignment.evaluation.severity === 'CRITICAL' ? 'text-danger/80' : 'text-warning/80'}>
                {assignment.evaluation.severity === 'CRITICAL'
                  ? 'השיבוץ נשמר, אך קיימת חריגה מהותית בדרישות או בסטטוס החייל.'
                  : 'השיבוץ נשמר, אך קיימות חריגות שכדאי לבדוק.'}
              </AlertDescription>
            </div>
            <ValidationBadge
              state={getEvaluationState(assignment.evaluation.severity)}
              text={getEvaluationBadgeText(assignment.evaluation.severity)}
            />
          </div>

          <ul className="mt-3 space-y-2 text-right text-xs">
            {assignment.evaluation.reasons.map((reason, index) => (
              <li
                key={`${assignment.id}-reason-${reason.code}-${index}`}
                className={
                  reason.severity === 'CRITICAL'
                    ? 'rounded-md border border-danger/20 bg-danger-soft/20 px-2 py-2 text-danger'
                    : 'rounded-md border border-warning/20 bg-warning-soft/20 px-2 py-2 text-warning'
                }
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <ValidationBadge
                    state={getEvaluationState(reason.severity)}
                    text={reason.severity === 'CRITICAL' ? 'קריטי' : 'אזהרה'}
                  />
                  <span className="font-medium">{formatEvaluationReason(reason)}</span>
                </div>
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <div className="mt-3 space-y-2 rounded-md border border-border bg-surface-elevated px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="destructive" size="sm" onClick={() => void removeAssignment()} disabled={isBusy}>
            הסרת שיבוץ
          </Button>
          <Label htmlFor={`planning-assignment-search-${taskInstance.id}-${slotIndex}`} className="text-xs text-muted">
            החלפת חייל
          </Label>
        </div>

        <Input
          id={`planning-assignment-search-${taskInstance.id}-${slotIndex}`}
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="חיפוש חייל חלופי"
          disabled={isBusy || isUsersPending}
        />

        {isUsersPending ? <p className="text-xs text-muted">טוען חיילים…</p> : null}

        {isUsersError ? (
          <div className="rounded-md border border-danger/30 bg-danger-soft/20 px-3 py-2 text-xs text-danger">
            <p>טעינת החיילים נכשלה.</p>
            <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={onRetryUsers}>
              ניסיון חוזר
            </Button>
          </div>
        ) : null}

        {!isUsersPending && !isUsersError && hasSearchText && matchingUsers.length === 0 ? (
          <p className="text-xs text-muted">לא נמצאו חיילים התואמים את החיפוש.</p>
        ) : null}

        {matchingUsers.length > 0 ? (
          <div className="space-y-2">
            {matchingUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                className="flex w-full items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-right text-sm text-foreground hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isBusy}
                onClick={() => void assignUser(user.id)}
              >
                <span className="min-w-0">
                  <span className="block font-medium">{formatUserName(user)}</span>
                  <span className="block text-xs text-muted">{user.personalNumber}</span>
                </span>
                <span className="text-xs text-muted">החלף</span>
              </button>
            ))}
          </div>
        ) : null}

        {assignmentError ? (
          <div className="rounded-md border border-danger/30 bg-danger-soft/20 px-3 py-2 text-xs text-danger" role="alert">
            {assignmentError}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function SchedulingTaskCard({
  taskInstance,
  activityId,
  selectedDate,
  companyUsers,
  isUsersPending,
  isUsersError,
  onRetryUsers,
  onRefreshDay,
}: {
  taskInstance: SchedulingDayTaskInstance
  activityId: string
  selectedDate: string
  companyUsers: CompanyUser[]
  isUsersPending: boolean
  isUsersError: boolean
  onRetryUsers: () => void
  onRefreshDay: () => Promise<unknown>
}) {
  const slotCount = Math.max(taskInstance.assignmentSlots.total, 0)
  const slots = Array.from({ length: slotCount }, (_, index) => index)

  return (
    <div className="w-[22rem] shrink-0 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 text-right">
          <p className="text-sm font-semibold text-foreground">{taskInstance.title}</p>
          <p className="mt-1 text-xs text-muted">{taskInstance.activityTask.name}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {taskInstance.isOvernight ? (
            <Badge className="border-warning/30 bg-warning-soft text-warning">לילה</Badge>
          ) : null}
          {taskInstance.validation.requiredErrors.length > 0 ? (
            <ValidationBadge state="error" text={getValidationBadgeText(taskInstance)} />
          ) : taskInstance.validation.warnings.length > 0 ? (
            <ValidationBadge state="warning" text={getValidationBadgeText(taskInstance)} />
          ) : (
            <ValidationBadge state="valid" text={getValidationBadgeText(taskInstance)} />
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 rounded-md border border-border bg-surface-elevated p-2 text-xs">
        <div className="text-right">
          <p className="text-muted">התחלה</p>
          <p className="font-medium text-foreground">{formatTime(taskInstance.startTime)}</p>
        </div>
        <div className="text-right">
          <p className="text-muted">סיום</p>
          <p className="font-medium text-foreground">{formatTime(taskInstance.endTime)}</p>
        </div>
      </div>

      <div className="mt-3 rounded-md border border-border bg-surface-elevated p-2 text-right">
        <p className="text-xs text-muted">סיכום כוח אדם</p>
        <p className="mt-1 text-sm font-medium text-foreground">
          {taskInstance.assignmentSlots.filled} מאוישים / {taskInstance.assignmentSlots.total} תקנים
        </p>
        <p className="mt-1 text-xs text-muted">פנויים: {taskInstance.assignmentSlots.unfilled}</p>
      </div>

      <div className="mt-3 space-y-2 text-right">
        <p className="text-sm font-medium text-foreground">דרישות</p>
        {taskInstance.requirements.manpower ? (
          <div className="rounded-md border border-border bg-surface-elevated px-2 py-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-foreground">כוח אדם</span>
              <Badge className={requirementBadgeClassName(taskInstance.requirements.manpower.required)}>
                {taskInstance.requirements.manpower.required ? 'חובה' : 'אופציונלי'}
              </Badge>
            </div>
            <p className="mt-1 text-muted">כמות: {taskInstance.requirements.manpower.quantity}</p>
          </div>
        ) : null}

        {taskInstance.requirements.roles.length > 0 ? (
          <div className="rounded-md border border-border bg-surface-elevated px-2 py-2 text-xs">
            <p className="font-medium text-foreground">תפקידים</p>
            <ul className="mt-1 space-y-1">
              {taskInstance.requirements.roles.map((role, index) => (
                <li key={`${taskInstance.id}-role-${role.roleId}-${index}`} className="flex items-center justify-between gap-2">
                  <span className="text-muted">{role.roleName ?? role.roleId} · {role.quantity}</span>
                  <Badge className={requirementBadgeClassName(role.required)}>{role.required ? 'חובה' : 'אופציונלי'}</Badge>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {taskInstance.requirements.qualifications.length > 0 ? (
          <div className="rounded-md border border-border bg-surface-elevated px-2 py-2 text-xs">
            <p className="font-medium text-foreground">הסמכות</p>
            <ul className="mt-1 space-y-1">
              {taskInstance.requirements.qualifications.map((qualification, index) => (
                <li key={`${taskInstance.id}-qualification-${qualification.qualificationId}-${index}`} className="flex items-center justify-between gap-2">
                  <span className="text-muted">{qualification.qualificationName ?? qualification.qualificationId} · {qualification.quantity}</span>
                  <Badge className={requirementBadgeClassName(qualification.required)}>{qualification.required ? 'חובה' : 'אופציונלי'}</Badge>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {taskInstance.validation.requiredErrors.length > 0 ? (
        <div className="mt-3 rounded-md border border-danger/30 bg-danger-soft/20 px-2 py-2 text-xs text-danger">
          <p className="font-medium">בעיות חובה</p>
          <ul className="mt-1 space-y-1">
            {taskInstance.validation.requiredErrors.map((issue, index) => (
              <li key={`${taskInstance.id}-required-${index}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {taskInstance.validation.warnings.length > 0 ? (
        <div className="mt-2 rounded-md border border-warning/30 bg-warning-soft/20 px-2 py-2 text-xs text-warning">
          <p className="font-medium">אזהרות</p>
          <ul className="mt-1 space-y-1">
            {taskInstance.validation.warnings.map((issue, index) => (
              <li key={`${taskInstance.id}-warning-${index}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        <p className="text-sm font-medium text-foreground text-right">שיבוץ תקנים</p>
        {slots.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-surface px-3 py-3 text-center text-xs text-muted">
            אין תקנים מוגדרים למופע זה.
          </div>
        ) : (
          <div className="space-y-2">
            {slots.map((slotIndex) => (
              <AssignmentSlotCard
                key={`${taskInstance.id}-slot-${slotIndex}`}
                taskInstance={taskInstance}
                slotIndex={slotIndex}
                activityId={activityId}
                selectedDate={selectedDate}
                companyUsers={companyUsers}
                isUsersPending={isUsersPending}
                isUsersError={isUsersError}
                onRetryUsers={onRetryUsers}
                onRefreshDay={onRefreshDay}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function ActivityPlanningPage() {
  const navigate = useNavigate()
  const { activityId } = useParams<{ activityId: string }>()
  const activityQuery = useActivityById(activityId)
  const activityTasksQuery = useActivityTasks(activityId)
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined)
  const [taskInstanceEditor, setTaskInstanceEditor] = useState<TaskInstanceEditorState | null>(null)
  const [taskInstanceEditorError, setTaskInstanceEditorError] = useState<string | null>(null)

  const createTaskInstanceMutation = useCreateActivityTaskInstance(taskInstanceEditor?.activityTaskId)
  const updateTaskInstanceMutation = useUpdateActivityTaskInstance()
  const deleteTaskInstanceMutation = useDeleteActivityTaskInstance()
  const companyUsersQuery = useCompanyUsers(activityQuery.data?.companyId, {
    page: 1,
    pageSize: 100,
    sortBy: 'firstName',
    sortOrder: 'asc',
  })

  useEffect(() => {
    const activity = activityQuery.data
    if (!activity) {
      return
    }

    const startDateKey = toDateKey(activity.startDate)
    const endDateKey = toDateKey(activity.endDate)
    if (!startDateKey || !endDateKey) {
      return
    }

    const nextSelectedDate =
      typeof selectedDate === 'string' && selectedDate.length > 0
        ? clampDateKeyToRange(selectedDate, startDateKey, endDateKey)
        : startDateKey

    if (nextSelectedDate !== selectedDate) {
      setSelectedDate(nextSelectedDate)
    }
  }, [activityQuery.data, selectedDate])

  const schedulingDayQuery = useActivitySchedulingDay(activityId, selectedDate)

  const activityStartDateKey = activityQuery.data ? toDateKey(activityQuery.data.startDate) : undefined
  const activityEndDateKey = activityQuery.data ? toDateKey(activityQuery.data.endDate) : undefined
  const companyUsers = companyUsersQuery.data?.items ?? []

  const canGoToPreviousDay =
    typeof selectedDate === 'string' &&
    selectedDate.length > 0 &&
    typeof activityStartDateKey === 'string' &&
    selectedDate > activityStartDateKey

  const canGoToNextDay =
    typeof selectedDate === 'string' &&
    selectedDate.length > 0 &&
    typeof activityEndDateKey === 'string' &&
    selectedDate < activityEndDateKey

  const goToPreviousDay = () => {
    if (!canGoToPreviousDay || !selectedDate) {
      return
    }

    setSelectedDate(addUtcDays(selectedDate, -1))
  }

  const goToNextDay = () => {
    if (!canGoToNextDay || !selectedDate) {
      return
    }

    setSelectedDate(addUtcDays(selectedDate, 1))
  }

  const isTaskInstanceFormBusy =
    createTaskInstanceMutation.isPending ||
    updateTaskInstanceMutation.isPending ||
    deleteTaskInstanceMutation.isPending

  const openCreateTaskInstanceDialog = (activityTaskId: string, taskName: string) => {
    if (!selectedDate) {
      return
    }

    setTaskInstanceEditorError(null)
    setTaskInstanceEditor(createDefaultTaskInstanceState(selectedDate, activityTaskId, taskName))
  }

  const openEditTaskInstanceDialog = (taskInstance: SchedulingDayTaskInstance) => {
    setTaskInstanceEditorError(null)
    setTaskInstanceEditor({
      mode: 'edit',
      taskInstanceId: taskInstance.id,
      activityTaskId: taskInstance.activityTask.id,
      title: taskInstance.title,
      startTime: toDateTimeInputValue(taskInstance.startTime),
      endTime: toDateTimeInputValue(taskInstance.endTime),
    })
  }

  const closeTaskInstanceDialog = () => {
    if (isTaskInstanceFormBusy) {
      return
    }

    setTaskInstanceEditorError(null)
    setTaskInstanceEditor(null)
  }

  const onTaskInstanceEditorChange = (field: 'activityTaskId' | 'title' | 'startTime' | 'endTime', value: string) => {
    setTaskInstanceEditor((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        [field]: value,
      }
    })
  }

  const submitTaskInstanceEditor = async () => {
    if (!taskInstanceEditor) {
      return
    }

    setTaskInstanceEditorError(null)

    const title = taskInstanceEditor.title.trim()
    if (title.length === 0) {
      setTaskInstanceEditorError('יש להזין כותרת למופע המשימה.')
      return
    }

    const start = new Date(taskInstanceEditor.startTime)
    const end = new Date(taskInstanceEditor.endTime)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setTaskInstanceEditorError('יש להזין זמני התחלה וסיום תקינים.')
      return
    }

    if (start >= end) {
      setTaskInstanceEditorError('שעת הסיום חייבת להיות אחרי שעת ההתחלה.')
      return
    }

    const payload = {
      title,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    }

    try {
      if (taskInstanceEditor.mode === 'create') {
        await createTaskInstanceMutation.mutateAsync(payload)
      } else {
        if (!taskInstanceEditor.taskInstanceId) {
          setTaskInstanceEditorError('לא נמצא מזהה מופע משימה לעדכון.')
          return
        }

        await updateTaskInstanceMutation.mutateAsync({
          taskInstanceId: taskInstanceEditor.taskInstanceId,
          body: payload,
        })
      }

      await schedulingDayQuery.refetch()
      setTaskInstanceEditor(null)
    } catch {
      setTaskInstanceEditorError('שמירת מופע המשימה נכשלה. אפשר לנסות שוב.')
    }
  }

  const deleteTaskInstance = async (taskInstance: SchedulingDayTaskInstance) => {
    const confirmed = window.confirm('האם למחוק את מופע המשימה?')
    if (!confirmed) {
      return
    }

    try {
      await deleteTaskInstanceMutation.mutateAsync(taskInstance.id)
      await schedulingDayQuery.refetch()
    } catch {
      setTaskInstanceEditorError('מחיקת מופע המשימה נכשלה. אפשר לנסות שוב.')
    }
  }

  if (!activityId) {
    return (
      <>
        <PageHeader title="תכנון תפעולי" description="לא התקבל מזהה פעילות תקין." />
        <ContentContainer className="pb-10">
          <ErrorState
            title="מזהה פעילות חסר"
            description="לא ניתן לטעון תכנון תפעולי בלי מזהה פעילות חוקי."
            action={
              <Button type="button" variant="secondary" onClick={() => navigate('/activities')}>
                חזרה לרשימת הפעילויות
              </Button>
            }
          />
        </ContentContainer>
      </>
    )
  }

  if (activityQuery.isPending || !selectedDate || schedulingDayQuery.isPending) {
    return (
      <>
        <PageHeader title="תכנון תפעולי" description="סקירת תכנון התפעול של הפעילות." />
        <ContentContainer className="pb-10">
          <LoadingState title="טוען תכנון תפעולי" description="נתוני הפעילות ויום השיבוץ נטענים כעת." />
        </ContentContainer>
      </>
    )
  }

  if (activityQuery.isError) {
    const error = activityQuery.error
    const isNotFound = isApiError(error) && error.status === 404

    return (
      <>
        <PageHeader title="תכנון תפעולי" description="סקירת תכנון התפעול של הפעילות." />
        <ContentContainer className="pb-10">
          <ErrorState
            title={isNotFound ? 'הפעילות לא נמצאה' : 'טעינת תכנון התפעול נכשל'}
            description={
              isNotFound
                ? 'לא נמצאה פעילות עם המזהה שנבחר. אפשר לחזור לרשימת הפעילויות.'
                : 'לא הצלחנו לטעון את תכנון התפעול של הפעילות. אפשר לנסות שוב.'
            }
            action={
              <Button type="button" variant="secondary" onClick={() => void activityQuery.refetch()}>
                ניסיון חוזר
              </Button>
            }
          />
        </ContentContainer>
      </>
    )
  }

  if (schedulingDayQuery.isError) {
    return (
      <>
        <PageHeader title="תכנון תפעולי" description="סקירת תכנון התפעול של הפעילות." />
        <ContentContainer className="pb-10">
          <ErrorState
            title="טעינת יום השיבוץ נכשלה"
            description="לא הצלחנו לטעון את נתוני יום השיבוץ. אפשר לנסות שוב."
            action={
              <Button type="button" variant="secondary" onClick={() => void schedulingDayQuery.refetch()}>
                ניסיון חוזר
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
        title={activityQuery.data?.name ?? 'תכנון תפעולי'}
        description="תצוגת שיבוץ יומית של הפעילות."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate(`/activities/${activityId}`)}>
              חזרה לפרטי הפעילות
            </Button>
          </div>
        }
      />

      <ContentContainer className="space-y-5 pb-10">
        <Card>
          <CardHeader className="px-4 py-4 sm:px-5">
            <CardTitle className="text-base">פרטי יום שיבוץ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4 sm:px-5 sm:pb-5">
            <div className="flex flex-col-reverse gap-3 rounded-lg border border-border bg-surface-elevated p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-muted">יום שיבוץ נבחר</p>
                <p className="mt-1 text-base font-semibold text-foreground" data-testid="planning-selected-day-title">
                  שיבוץ — {formatSelectedDay(selectedDate)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={goToPreviousDay}
                  disabled={!canGoToPreviousDay}
                >
                  יום קודם
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={goToNextDay}
                  disabled={!canGoToNextDay}
                >
                  יום הבא
                </Button>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-border bg-surface-elevated p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted">שם הפעילות</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{activityQuery.data?.name}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-elevated p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted">תאריך התחלה</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{activityQuery.data ? formatDate(activityQuery.data.startDate) : '-'}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-elevated p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted">תאריך סיום</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{activityQuery.data ? formatDate(activityQuery.data.endDate) : '-'}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-elevated p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted">תאריך נבחר</p>
                <p className="mt-1 text-sm font-semibold text-foreground" data-testid="planning-selected-date">
                  {formatDate(selectedDate)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface-elevated p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted">סטטוס יום</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {schedulingDayQuery.data?.isDayOpened ? 'היום פתוח' : 'היום סגור'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">לוח שיבוץ יומי</CardTitle>
              {schedulingDayQuery.data?.isDayOpened ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const defaultTask = activityTasksQuery.data?.[0]
                    if (!defaultTask) {
                      setTaskInstanceEditorError('לא נמצאו משימות פעילות להוספת מופע.')
                      return
                    }

                    openCreateTaskInstanceDialog(defaultTask.id, defaultTask.name)
                  }}
                  disabled={activityTasksQuery.isPending || !activityTasksQuery.data || activityTasksQuery.data.length === 0}
                >
                  הוספת מופע משימה
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-4 pb-5 sm:px-5">
            {taskInstanceEditorError ? (
              <div className="rounded-md border border-danger/30 bg-danger-soft/20 px-3 py-2 text-sm text-danger" role="alert">
                {taskInstanceEditorError}
              </div>
            ) : null}
            {!schedulingDayQuery.data?.isDayOpened ? (
              <EmptyState
                title="היום עדיין לא נפתח"
                description="לא קיימים מופעי משימות ליום זה. אפשר לפתוח את היום בשלב הבא של הפיתוח."
              />
            ) : schedulingDayQuery.data.taskInstances.length === 0 ? (
              <EmptyState
                title="אין מופעי משימה ליום פתוח זה"
                description="היום פתוח, אבל עדיין לא הוגדרו מופעי משימה לשיבוץ."
              />
            ) : (
              <ScrollArea className="w-full" dir="rtl">
                <div className="flex min-w-max gap-3 pb-2">
                  {schedulingDayQuery.data.taskInstances.map((taskInstance) => (
                    <div key={taskInstance.id} className="space-y-2">
                      <div className="flex items-center justify-end gap-2">
                        <Button type="button" variant="secondary" size="sm" onClick={() => openEditTaskInstanceDialog(taskInstance)}>
                          עריכה
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={deleteTaskInstanceMutation.isPending}
                          onClick={() => void deleteTaskInstance(taskInstance)}
                        >
                          מחיקה
                        </Button>
                      </div>
                      <SchedulingTaskCard
                        taskInstance={taskInstance}
                        activityId={activityId}
                        selectedDate={selectedDate}
                        companyUsers={companyUsers}
                        isUsersPending={companyUsersQuery.isPending}
                        isUsersError={companyUsersQuery.isError}
                        onRetryUsers={() => {
                          void companyUsersQuery.refetch()
                        }}
                        onRefreshDay={() => schedulingDayQuery.refetch()}
                      />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Dialog open={taskInstanceEditor !== null} onOpenChange={(open) => {
          if (!open) {
            closeTaskInstanceDialog()
          }
        }}>
          <DialogContent aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>{taskInstanceEditor?.mode === 'edit' ? 'עריכת מופע משימה' : 'מופע משימה חדש'}</DialogTitle>
              <DialogDescription>
                {taskInstanceEditor?.mode === 'edit'
                  ? 'אפשר לעדכן את המשימה המשויכת, הכותרת וטווח הזמנים.'
                  : 'בחר משימה, עדכן כותרת והגדר זמני התחלה וסיום.'}
              </DialogDescription>
            </DialogHeader>

            {taskInstanceEditor ? (
              <div className="space-y-4">
                <div className="space-y-2 text-right">
                  <Label htmlFor="planning-task-instance-task">משימה</Label>
                  <Select
                    value={taskInstanceEditor.activityTaskId}
                    onValueChange={(value) => onTaskInstanceEditorChange('activityTaskId', value)}
                    disabled={
                      isTaskInstanceFormBusy ||
                      taskInstanceEditor.mode === 'edit' ||
                      activityTasksQuery.isPending ||
                      !activityTasksQuery.data ||
                      activityTasksQuery.data.length === 0
                    }
                  >
                    <SelectTrigger id="planning-task-instance-task">
                      <SelectValue placeholder="בחירת משימה" />
                    </SelectTrigger>
                    <SelectContent>
                      {(activityTasksQuery.data ?? []).map((task) => (
                        <SelectItem key={task.id} value={task.id}>
                          {task.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 text-right">
                  <Label htmlFor="planning-task-instance-title">כותרת</Label>
                  <Input
                    id="planning-task-instance-title"
                    value={taskInstanceEditor.title}
                    onChange={(event) => onTaskInstanceEditorChange('title', event.target.value)}
                    disabled={isTaskInstanceFormBusy}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2 text-right">
                    <Label htmlFor="planning-task-instance-start">התחלה</Label>
                    <Input
                      id="planning-task-instance-start"
                      type="datetime-local"
                      value={taskInstanceEditor.startTime}
                      onChange={(event) => onTaskInstanceEditorChange('startTime', event.target.value)}
                      disabled={isTaskInstanceFormBusy}
                    />
                  </div>

                  <div className="space-y-2 text-right">
                    <Label htmlFor="planning-task-instance-end">סיום</Label>
                    <Input
                      id="planning-task-instance-end"
                      type="datetime-local"
                      value={taskInstanceEditor.endTime}
                      onChange={(event) => onTaskInstanceEditorChange('endTime', event.target.value)}
                      disabled={isTaskInstanceFormBusy}
                    />
                  </div>
                </div>

                {taskInstanceEditorError ? (
                  <div className="rounded-md border border-danger/30 bg-danger-soft/20 px-3 py-2 text-sm text-danger" role="alert">
                    {taskInstanceEditorError}
                  </div>
                ) : null}
              </div>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={closeTaskInstanceDialog} disabled={isTaskInstanceFormBusy}>
                ביטול
              </Button>
              <Button type="button" onClick={() => void submitTaskInstanceEditor()} disabled={isTaskInstanceFormBusy || !taskInstanceEditor}>
                {taskInstanceEditor?.mode === 'edit' ? 'שמירת שינויים' : 'יצירת מופע'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ContentContainer>
    </>
  )
}
