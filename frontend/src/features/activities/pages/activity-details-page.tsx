import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { ApiError } from '@/api/client'
import { ContentContainer } from '@/app/layout/content-container'
import { PageHeader } from '@/app/layout/page-header'
import { ActivityTaskList } from '@/features/activities/components/activity-task-list'
import { useActivityById, useActivityOverview } from '@/features/activities/queries/use-activities'
import { useActivityTasks } from '@/features/activities/queries/use-activity-tasks'
import type { ActivityOverview, ActivityType } from '@/features/activities/types/activity'
import { ErrorState } from '@/shared/components/error-state'
import { LoadingState } from '@/shared/components/loading-state'
import { StatusBadge } from '@/shared/components/status-badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'

const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  TRAINING: 'אימון',
  EMPLOYMENT: 'תעסוקה',
  TRAINING_COURSE: 'השתלמות',
}

const getActivityTypeLabel = (type: ActivityType | null | undefined) => {
  if (!type) {
    return 'פעילות'
  }

  return ACTIVITY_TYPE_LABELS[type] ?? 'פעילות'
}

const isHistoricalActivity = (activity: { status: string; endDate: string } | undefined, now = new Date()) => {
  if (!activity) {
    return false
  }

  return activity.status === 'COMPLETED' || activity.status === 'CANCELLED' || new Date(activity.endDate) <= now
}

const dateFormatter = new Intl.DateTimeFormat('he-IL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

const formatDate = (value: string) => dateFormatter.format(new Date(value))

const isApiError = (value: unknown): value is ApiError => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    typeof (value as { status?: unknown }).status === 'number'
  )
}

function FieldRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 border-t border-border pt-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  )
}

function OverviewStatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-elevated p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      {detail ? <p className="mt-1 text-xs text-muted">{detail}</p> : null}
    </div>
  )
}

export function ActivityDetailsPage() {
  const navigate = useNavigate()
  const { activityId } = useParams<{ activityId: string }>()
  const activityQuery = useActivityById(activityId)
  const overviewQuery = useActivityOverview(activityId)
  const tasksQuery = useActivityTasks(activityId)

  const isNotFound = useMemo(() => {
    if (!activityQuery.isError || !isApiError(activityQuery.error)) {
      return false
    }

    return activityQuery.error.status === 404
  }, [activityQuery.error, activityQuery.isError])

  const overview = overviewQuery.data as ActivityOverview | undefined
  const isHistorical = isHistoricalActivity(activityQuery.data)

  const overviewCards = useMemo(() => {
    if (!overview) {
      return []
    }

    const tasksOverview = overview.tasksOverview ?? []
    const totalAssignments = tasksOverview.reduce(
      (sum, task) => sum + (task.assignmentSummary?.totalAssignments ?? 0),
      0,
    )
    const totalRequiredErrors = tasksOverview.reduce(
      (sum, task) => sum + (task.validationSummary?.requiredErrorCount ?? 0),
      0,
    )
    const totalWarnings = tasksOverview.reduce(
      (sum, task) => sum + (task.validationSummary?.warningCount ?? 0),
      0,
    )
    const totalTaskInstances = tasksOverview.reduce(
      (sum, task) => sum + (task.assignmentSummary?.totalTaskInstances ?? task.taskInstances?.length ?? 0),
      0,
    )

    const availabilityEntries = Object.entries(overview.availabilitySummary?.byAvailability ?? {})

    return [
      {
        label: 'כוח אדם',
        value: String(overview.manpowerSummary?.participantCount ?? 0),
        detail:
          Object.entries(overview.manpowerSummary?.dailyStatusSummary ?? {}).length > 0
            ? Object.entries(overview.manpowerSummary.dailyStatusSummary ?? {})
                .map(([status, count]) => `${status}: ${count}`)
                .join(' · ')
            : 'אין נתוני כוח אדם',
      },
      {
        label: 'משימות',
        value: String(tasksOverview.length),
        detail: totalTaskInstances > 0 ? `${totalTaskInstances} מופעים` : 'אין מופעים',
      },
      {
        label: 'שיבוצים',
        value: String(totalAssignments),
        detail: `${tasksOverview.filter((task) => (task.assignmentSummary?.unassignedTaskInstances ?? 0) > 0).length} משימות עם תזמון חלקי`,
      },
      {
        label: 'אימות',
        value: String(totalRequiredErrors + totalWarnings),
        detail: `${totalRequiredErrors} שגיאות · ${totalWarnings} אזהרות`,
      },
      {
        label: 'זמינות',
        value: String(availabilityEntries.reduce((sum, [, count]) => sum + Number(count ?? 0), 0)),
        detail:
          availabilityEntries.length > 0
            ? availabilityEntries.map(([status, count]) => `${status}: ${count}`).join(' · ')
            : 'אין נתוני זמינות',
      },
    ]
  }, [overview])

  if (!activityId) {
    return (
      <>
        <PageHeader title="פרטי פעילות" description="לא התקבל מזהה פעילות חוקי." />
        <ContentContainer className="pb-10">
          <ErrorState
            title="מזהה פעילות חסר"
            description="לא ניתן לטעון את פרטי הפעילות בלי מזהה תקין."
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
        title={activityQuery.data?.name ?? 'פרטי פעילות'}
        description="תצוגת פרטי פעילות עבור מפקד פלוגה"
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {activityQuery.data ? <StatusBadge value={activityQuery.data.status} /> : null}
            {!isHistorical && activityQuery.data ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate(`/activities/${activityQuery.data?.id}/planning`)}
              >
                תכנון תפעולי
              </Button>
            ) : null}
            {!isHistorical && activityQuery.data ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate(`/activities/${activityQuery.data?.id}/availability`)}
              >
                זמינות
              </Button>
            ) : null}
            {activityQuery.data ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate(`/activities/${activityQuery.data?.id}/edit`)}
              >
                עריכת פעילות
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              onClick={() => console.info('טבלת שיבוץ — טרם מומש')}
            >
              טבלת שיבוץ
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(`/activities/${activityQuery.data?.id}/personnel-status-matrix`)}
            >
              טבלת נוכחות
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/activities')}>
              חזרה לפעילויות
            </Button>
          </div>
        }
      />

      <ContentContainer className="space-y-5 pb-10">
        {activityQuery.isPending ? (
          <LoadingState title="טוען פרטי פעילות" description="נתוני הפעילות נטענים כעת." />
        ) : activityQuery.isError ? (
          <ErrorState
            title={isNotFound ? 'הפעילות לא נמצאה' : 'טעינת פרטי הפעילות נכשלה'}
            description={
              isNotFound
                ? 'לא נמצאה פעילות עם המזהה שנבחר. אפשר לחזור לרשימת הפעילויות.'
                : 'לא הצלחנו לטעון את פרטי הפעילות. אפשר לנסות שוב או לחזור לרשימה.'
            }
            action={
              <Button type="button" variant="secondary" onClick={() => void activityQuery.refetch()}>
                ניסיון חוזר
              </Button>
            }
          />
        ) : (
          <>
            <Card>
              <CardHeader className="px-4 py-4 sm:px-5">
                <CardTitle className="text-base">
                  {isHistorical ? 'פרטי פעילות היסטורית' : 'פרטי פעילות'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4 sm:px-5 sm:pb-5">
                <dl className="space-y-3">
                  <FieldRow label={isHistorical ? 'שם הפעילות' : 'שם הפעילות'} value={activityQuery.data.name} />
                  <FieldRow label="סוג הפעילות" value={getActivityTypeLabel(activityQuery.data.type)} />
                  <FieldRow label="תאריך התחלה" value={formatDate(activityQuery.data.startDate)} />
                  <FieldRow label="תאריך סיום" value={formatDate(activityQuery.data.endDate)} />
                  <FieldRow label="סטטוס" value={<StatusBadge value={activityQuery.data.status} />} />
                  {!isHistorical ? <FieldRow label="מזהה פלוגה" value={activityQuery.data.companyId} /> : null}
                </dl>

                {isHistorical && overview ? (
                  <div className="grid gap-3 pt-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-border bg-surface-elevated p-4">
                      <p className="text-xs uppercase tracking-wide text-muted">ממוצע ימי חופשה ליחיד</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {Number(overview.averageHolidayDaysPerSoldier ?? 0).toString()}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-surface-elevated p-4">
                      <p className="text-xs uppercase tracking-wide text-muted">ימי פעילות שלישותיים</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {Number(overview.administrativeActiveDays ?? 0).toString()}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-surface-elevated p-4">
                      <p className="text-xs uppercase tracking-wide text-muted">שכר יומיים</p>
                      <p className="mt-2 text-lg font-medium text-foreground">אין נתונים להצגה</p>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {!isHistorical ? (
              <>
                <Card>
                  <CardHeader className="px-4 py-4 sm:px-5">
                    <CardTitle className="text-base">סקירה</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
                    {overviewQuery.isPending ? (
                      <LoadingState title="טוען סקירה" description="נתוני הסקירה נטענים כעת." />
                    ) : overviewQuery.isError ? (
                      <ErrorState
                        title="טעינת סקירה נכשלה"
                        description="לא הצלחנו לטעון את סקירת הפעילות. אפשר לנסות שוב."
                        action={
                          <Button type="button" variant="secondary" onClick={() => void overviewQuery.refetch()}>
                            ניסיון חוזר
                          </Button>
                        }
                      />
                    ) : overview ? (
                      <>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                          {overviewCards.map((item) => (
                            <OverviewStatCard
                              key={item.label}
                              label={item.label}
                              value={item.value}
                              detail={item.detail}
                            />
                          ))}
                        </div>

                        {overview.tasksOverview && overview.tasksOverview.length > 0 ? (
                          <div className="space-y-2">
                            <h3 className="text-sm font-medium text-foreground">משימות</h3>
                            <div className="space-y-2">
                              {overview.tasksOverview.slice(0, 4).map((task) => (
                                <div key={task.taskId} className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2 text-sm">
                                  <span className="font-medium text-foreground">{task.taskName}</span>
                                  <span className="text-muted">
                                    {task.assignmentSummary?.totalAssignments ?? task.assignedUsersCount ?? 0} שיבוצים
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </CardContent>
                </Card>

                {tasksQuery.isError ? (
                  <ActivityTaskList
                    tasks={tasksQuery.data}
                    isPending={tasksQuery.isPending}
                    isError={tasksQuery.isError}
                    error={tasksQuery.error as { status?: number; message?: string }}
                    refetch={() => void tasksQuery.refetch()}
                    onCreate={() => navigate(`/activities/${activityId}/tasks/new`)}
                    onOpenTaskInstances={(task) => navigate(`/activities/${activityId}/tasks/${task.id}/task-instances`)}
                    onOpenRequirements={(task) => navigate(`/activities/${activityId}/tasks/${task.id}/requirements`)}
                  />
                ) : (
                  <ActivityTaskList
                    tasks={tasksQuery.data}
                    isPending={tasksQuery.isPending}
                    isError={tasksQuery.isError}
                    onCreate={() => navigate(`/activities/${activityId}/tasks/new`)}
                    onOpenTaskInstances={(task) => navigate(`/activities/${activityId}/tasks/${task.id}/task-instances`)}
                    onOpenRequirements={(task) => navigate(`/activities/${activityId}/tasks/${task.id}/requirements`)}
                  />
                )}
              </>
            ) : null}
          </>
        )}
      </ContentContainer>
    </>
  )
}
