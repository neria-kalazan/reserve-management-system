import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { ApiError } from '@/api/client'
import type { SchedulingDayTaskInstance } from '@/features/activities/api/scheduling-day'
import { ContentContainer } from '@/app/layout/content-container'
import { PageHeader } from '@/app/layout/page-header'
import { useActivityById } from '@/features/activities/queries/use-activities'
import { useActivitySchedulingDay } from '@/features/activities/queries/use-activity-scheduling-day'
import { EmptyState } from '@/shared/components/empty-state'
import { ErrorState } from '@/shared/components/error-state'
import { LoadingState } from '@/shared/components/loading-state'
import { StatusBadge, ValidationBadge } from '@/shared/components/status-badge'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { ScrollArea } from '@/shared/components/ui/scroll-area'

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

function AssignmentSlotCard({
  taskInstance,
  slotIndex,
}: {
  taskInstance: SchedulingDayTaskInstance
  slotIndex: number
}) {
  const assignment = taskInstance.assignments[slotIndex]

  if (!assignment) {
    return (
      <div className="rounded-md border border-dashed border-border bg-surface px-3 py-3 text-right">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">מקום {slotIndex + 1}</p>
          <Badge className="border-border-strong bg-border text-muted-foreground">פנוי</Badge>
        </div>
        <p className="mt-2 text-xs text-muted">לא שובץ חייל במיקום זה.</p>
      </div>
    )
  }

  const userName = `${assignment.user.firstName} ${assignment.user.lastName}`.trim()

  return (
    <div className="rounded-md border border-border bg-surface px-3 py-3 text-right">
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
        <Badge className={getEvaluationBadgeClassName(assignment.evaluation.severity)}>
          {assignment.evaluation.severity === 'CRITICAL'
            ? 'קריטי'
            : assignment.evaluation.severity === 'WARNING'
              ? 'אזהרה'
              : 'תקין'}
        </Badge>
        {assignment.availability ? (
          <>
            <StatusBadge value={assignment.availability.status} />
            <StatusBadge value={assignment.availability.availability} />
          </>
        ) : null}
      </div>

      {assignment.evaluation.reasonMessages.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs text-muted">
          {assignment.evaluation.reasonMessages.map((reason, index) => (
            <li key={`${assignment.id}-reason-${index}`} className="rounded-sm bg-surface-elevated px-2 py-1">
              {reason}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function SchedulingTaskCard({ taskInstance }: { taskInstance: SchedulingDayTaskInstance }) {
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
              <AssignmentSlotCard key={`${taskInstance.id}-slot-${slotIndex}`} taskInstance={taskInstance} slotIndex={slotIndex} />
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
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined)

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
            <CardTitle className="text-base">לוח שיבוץ יומי</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 pb-5 sm:px-5">
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
                    <SchedulingTaskCard key={taskInstance.id} taskInstance={taskInstance} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </ContentContainer>
    </>
  )
}
