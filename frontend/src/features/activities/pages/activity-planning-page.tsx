import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { ApiError } from '@/api/client'
import { ContentContainer } from '@/app/layout/content-container'
import { PageHeader } from '@/app/layout/page-header'
import { useActivityAvailability, useActivityById } from '@/features/activities/queries/use-activities'
import {
  useActivityTaskInstances,
  useActivityTasks,
  useTaskInstanceValidation,
  useTaskInstanceWorkspace,
} from '@/features/activities/queries/use-activity-tasks'
import { ErrorState } from '@/shared/components/error-state'
import { LoadingState } from '@/shared/components/loading-state'
import { StatusBadge, ValidationBadge } from '@/shared/components/status-badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'

const dateFormatter = new Intl.DateTimeFormat('he-IL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
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

const getValidationBadgeText = (validation: { requiredErrors: { message: string }[]; warnings: { message: string }[]; summary: { isValid: boolean } } | undefined) => {
  if (!validation) {
    return null
  }

  if (validation.requiredErrors.length > 0) {
    return `${validation.requiredErrors.length} ${validation.requiredErrors.length === 1 ? 'בעיה' : 'בעיות'}`
  }

  if (validation.warnings.length > 0) {
    return `${validation.warnings.length} ${validation.warnings.length === 1 ? 'אזהרה' : 'אזהרות'}`
  }

  return 'תקין'
}

const getCoverageState = (requiredManpower: number | undefined, assignedManpower: number) => {
  if (typeof requiredManpower !== 'number' || !Number.isFinite(requiredManpower) || requiredManpower < 0) {
    return 'unknown' as const
  }

  if (assignedManpower < requiredManpower) {
    return 'under' as const
  }

  return 'full' as const
}

function TaskInstancePlanningRow({
  activityId,
  taskId,
  taskInstance,
  taskName,
}: {
  activityId: string
  taskId: string
  taskInstance: {
    id: string
    title: string
    startTime: string
    endTime: string
  }
  taskName: string
}) {
  const navigate = useNavigate()
  const workspaceQuery = useTaskInstanceWorkspace(taskInstance.id)
  const validationQuery = useTaskInstanceValidation(taskInstance.id)

  const requirements = workspaceQuery.data?.requirements
  const currentAssignments = workspaceQuery.data?.currentAssignments ?? []
  const validation = validationQuery.data

  const requiredManpower = requirements?.manpower?.required ? requirements.manpower.quantity : undefined
  const assignedManpower = currentAssignments.length
  const assignedUsers = currentAssignments
    .map(({ user }) => {
      const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim()
      return name.length > 0 ? name : null
    })
    .filter((value): value is string => Boolean(value))
  const coverageState = getCoverageState(requiredManpower, assignedManpower)
  const coverageClasses = {
    full: 'border-success/30 bg-success-soft text-success',
    under: 'border-warning/30 bg-warning-soft text-warning',
    unknown: 'border-border bg-surface-elevated text-muted',
  }
  const coverageText = {
    full: 'כיסוי מלא',
    under: 'מחסור בכוח אדם',
    unknown: 'כוח אדם לא זמין',
  }

  if (workspaceQuery.isPending || validationQuery.isPending) {
    return (
      <div className="rounded-md border border-border bg-surface px-3 py-4">
        <LoadingState title="טוען תכנון מופע" description="נתוני המופע נטענים כעת." />
      </div>
    )
  }

  if (workspaceQuery.isError || validationQuery.isError) {
    return (
      <div className="rounded-md border border-border bg-surface px-3 py-4">
        <ErrorState
          title="טעינת המופע נכשלה"
          description="לא הצלחנו לטעון את נתוני המופע. אפשר לנסות שוב."
          action={
            <Button type="button" variant="secondary" onClick={() => {
              void workspaceQuery.refetch()
              void validationQuery.refetch()
            }}>
              ניסיון חוזר
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface px-3 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-semibold text-foreground">{taskInstance.title || taskName}</p>
          <p className="mt-1 break-words text-xs text-muted">
            {taskName} · {formatTime(taskInstance.startTime)}–{formatTime(taskInstance.endTime)}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
          {validation ? (
            validation.requiredErrors.length > 0 ? (
              <ValidationBadge state="error" text={getValidationBadgeText(validation) ?? 'בעיה'} />
            ) : validation.warnings.length > 0 ? (
              <ValidationBadge state="warning" text={getValidationBadgeText(validation) ?? 'אזהרה'} />
            ) : (
              <ValidationBadge state="valid" text={getValidationBadgeText(validation) ?? 'תקין'} />
            )
          ) : null}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => navigate(`/activities/${activityId}/tasks/${taskId}/task-instances`)}
          >
            שיבוץ
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-md border border-border bg-surface-elevated p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted">תאריך</p>
          <p className="mt-1 break-words text-sm font-medium text-foreground">{formatDate(taskInstance.startTime)}</p>
        </div>
        <div className="rounded-md border border-border bg-surface-elevated p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted">התחלה</p>
          <p className="mt-1 break-words text-sm font-medium text-foreground">{formatTime(taskInstance.startTime)}</p>
        </div>
        <div className="rounded-md border border-border bg-surface-elevated p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted">סיום</p>
          <p className="mt-1 break-words text-sm font-medium text-foreground">{formatTime(taskInstance.endTime)}</p>
        </div>
        <div className="rounded-md border border-border bg-surface-elevated p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted">כוח אדם</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
            <span>{typeof requiredManpower === 'number' ? `דרוש: ${requiredManpower}` : 'דרוש: לא ידוע'}</span>
            <span className="text-muted">·</span>
            <span>מוקצים: {assignedManpower}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-md border border-border bg-surface-elevated px-3 py-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>משובצים:</span>
            <span className="font-medium text-foreground">{assignedManpower}</span>
            {typeof requiredManpower === 'number' ? (
              <>
                <span className="text-muted">/</span>
                <span className="font-medium text-foreground">{requiredManpower}</span>
              </>
            ) : null}
          </div>
          <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold ${coverageClasses[coverageState]}`}>
            {coverageText[coverageState]} · {assignedManpower} / {typeof requiredManpower === 'number' ? requiredManpower : '—'}
          </span>
        </div>
        {assignedUsers.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {assignedUsers.map((name) => (
              <li key={name} className="max-w-full rounded-full border border-border bg-surface px-2 py-1 text-[11px] text-foreground break-all">
                {name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-muted">אין משתמשים משובצים עדיין.</p>
        )}
      </div>

      {validation && validation.requiredErrors.length > 0 ? (
        <div className="mt-3 rounded-md border border-danger/20 bg-danger-soft/20 p-3 text-xs text-danger">
          {validation.requiredErrors.map((issue, index) => (
            <div key={`${issue.type}-${issue.message}-${index}`}>{issue.message}</div>
          ))}
        </div>
      ) : null}

      {validation && validation.warnings.length > 0 ? (
        <div className="mt-2 rounded-md border border-warning/20 bg-warning-soft/20 p-3 text-xs text-warning">
          {validation.warnings.map((issue, index) => (
            <div key={`${issue.type}-${issue.message}-${index}`}>{issue.message}</div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ActivityAvailabilitySection({ activityId }: { activityId: string }) {
  const availabilityQuery = useActivityAvailability(activityId)

  if (availabilityQuery.isPending) {
    return (
      <Card>
        <CardHeader className="px-4 py-4 sm:px-5">
          <CardTitle className="text-base">זמינות פעילות</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-5 sm:pb-5">
          <LoadingState title="טוען זמינות פעילות" description="נתוני הזמינות של הפעילות נטענים כעת." />
        </CardContent>
      </Card>
    )
  }

  if (availabilityQuery.isError) {
    return (
      <Card>
        <CardHeader className="px-4 py-4 sm:px-5">
          <CardTitle className="text-base">זמינות פעילות</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-5 sm:pb-5">
          <ErrorState
            title="טעינת זמינות הפעילות נכשלה"
            description="לא הצלחנו לטעון את מצב הזמינות של המשתמשים. אפשר לנסות שוב."
            action={
              <Button type="button" variant="secondary" onClick={() => void availabilityQuery.refetch()}>
                ניסיון חוזר
              </Button>
            }
          />
        </CardContent>
      </Card>
    )
  }

  const availabilityItems = availabilityQuery.data ?? []

  return (
    <Card>
      <CardHeader className="px-4 py-4 sm:px-5">
        <CardTitle className="text-base">זמינות פעילות</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4 sm:px-5 sm:pb-5">
        {availabilityItems.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-surface px-3 py-6 text-center text-sm text-muted">
            אין נתוני זמינות להצגה
          </div>
        ) : (
          <div className="space-y-2">
            {availabilityItems.map((item) => {
              const userName = item.user
                ? [item.user.firstName, item.user.lastName].filter(Boolean).join(' ').trim() || item.user.email || item.user.id
                : item.userId

              return (
                <div key={`${item.userId}-${item.date}`} className="rounded-md border border-border bg-surface-elevated px-3 py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{userName}</p>
                      <p className="mt-1 text-xs text-muted">{formatDate(item.date)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge value={item.status} />
                      <StatusBadge value={item.availability} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TaskPlanningCard({
  activityId,
  task,
}: {
  activityId: string
  task: { id: string; name: string; description: string | null }
}) {
  const taskInstancesQuery = useActivityTaskInstances(task.id)
  const instances = taskInstancesQuery.data ?? []

  if (taskInstancesQuery.isPending) {
    return (
      <div className="space-y-3 rounded-lg border border-border bg-surface px-3 py-3">
        <LoadingState title="טוען מופעי משימה" description="מופעי המשימה נטענים כעת." />
      </div>
    )
  }

  if (taskInstancesQuery.isError) {
    return (
      <div className="space-y-3 rounded-lg border border-border bg-surface px-3 py-3">
        <ErrorState
          title="טעינת מופעי המשימה נכשלה"
          description="לא הצלחנו לטעון את מופעי המשימה. אפשר לנסות שוב."
          action={
            <Button type="button" variant="secondary" onClick={() => void taskInstancesQuery.refetch()}>
              ניסיון חוזר
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface px-3 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="break-words text-base font-semibold text-foreground">{task.name}</p>
          {task.description ? <p className="mt-1 break-words text-xs text-muted">{task.description}</p> : null}
        </div>
        <span className="self-start rounded-full border border-border bg-surface-elevated px-2 py-1 text-xs text-muted">
          {instances.length} מופעים
        </span>
      </div>

      {instances.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-surface px-3 py-6 text-center text-sm text-muted">
          אין מופעים להצגה עבור משימה זו.
        </div>
      ) : (
        <div className="space-y-3">
          {instances.map((instance) => (
            <TaskInstancePlanningRow
              key={instance.id}
              activityId={activityId}
              taskId={task.id}
              taskInstance={instance}
              taskName={task.name}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function ActivityPlanningPage() {
  const navigate = useNavigate()
  const { activityId } = useParams<{ activityId: string }>()
  const activityQuery = useActivityById(activityId)
  const tasksQuery = useActivityTasks(activityId)

  const hasAnyTaskInstances = useMemo(
    () => tasksQuery.data?.some((task) => (task.id ? true : false)) ?? false,
    [tasksQuery.data],
  )

  if (!activityId) {
    return (
      <>
        <PageHeader title="תכנון תפעולי" description="לא התקבל מזהה תעסוקה תקין." />
        <ContentContainer className="pb-10">
          <ErrorState
            title="מזהה תעסוקה חסר"
            description="לא ניתן לטעון תכנון תפעולי בלי מזהה תעסוקה חוקי."
            action={
              <Button type="button" variant="secondary" onClick={() => navigate('/activities')}>
                חזרה לרשימת התעסוקות
              </Button>
            }
          />
        </ContentContainer>
      </>
    )
  }

  if (activityQuery.isPending || tasksQuery.isPending) {
    return (
      <>
        <PageHeader title="תכנון תפעולי" description="סקירת תכנון התפעול של הפעילות." />
        <ContentContainer className="pb-10">
          <LoadingState title="טוען תכנון תפעולי" description="נתוני הפעילות והמופעים נטענים כעת." />
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

  if (tasksQuery.isError) {
    return (
      <>
        <PageHeader title="תכנון תפעולי" description="סקירת תכנון התפעול של הפעילות." />
        <ContentContainer className="pb-10">
          <ErrorState
            title="טעינת משימות הפעילות נכשלה"
            description="לא הצלחנו לטעון את המשימות של הפעילות. אפשר לנסות שוב."
            action={
              <Button type="button" variant="secondary" onClick={() => void tasksQuery.refetch()}>
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
        description="תצוגת תכנון תפעולי של הפעילות, לפי משימות ומופעים."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate(`/activities/${activityId}`)}>
              חזרה לפרטי התעסוקה
            </Button>
          </div>
        }
      />

      <ContentContainer className="space-y-5 pb-10">
        <Card>
          <CardHeader className="px-4 py-4 sm:px-5">
            <CardTitle className="text-base">תכנון תפעולי</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4 sm:px-5 sm:pb-5">
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
                <p className="text-[11px] uppercase tracking-wide text-muted">סטטוס</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{activityQuery.data?.status ?? '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 py-4 sm:px-5">
            <CardTitle className="text-base">מופעי משימות</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 pb-5 sm:px-5">
            {tasksQuery.data && tasksQuery.data.length === 0 ? (
              <div className="rounded-md border border-dashed border-border bg-surface px-3 py-8 text-center text-sm text-muted">
                אין משימות להצגה עבור פעילות זו.
              </div>
            ) : null}

            {tasksQuery.data && tasksQuery.data.length > 0 ? (
              <div className="space-y-4">
                {tasksQuery.data.map((task) => (
                  <TaskPlanningCard key={task.id} activityId={activityId} task={task} />
                ))}
              </div>
            ) : null}

            {!tasksQuery.data || !hasAnyTaskInstances ? (
              <div className="rounded-md border border-dashed border-border bg-surface px-3 py-8 text-center text-sm text-muted">
                אין מופעים להצגה עבור משימה זו.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <ActivityAvailabilitySection activityId={activityId} />
      </ContentContainer>
    </>
  )
}
