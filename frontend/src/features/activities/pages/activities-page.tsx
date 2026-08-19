import { useNavigate } from 'react-router-dom'
import { CalendarDays, FolderOpen, Radio } from 'lucide-react'

import { ContentContainer } from '@/app/layout/content-container'
import { PageHeader } from '@/app/layout/page-header'
import { useCompanyActivities } from '@/features/activities/queries/use-activities'
import type { Activity, ActivityType } from '@/features/activities/types/activity'
import { EmptyState } from '@/shared/components/empty-state'
import { ErrorState } from '@/shared/components/error-state'
import { LoadingState } from '@/shared/components/loading-state'
import { StatusBadge } from '@/shared/components/status-badge'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { cn } from '@/shared/utils/cn'

const dateFormatter = new Intl.DateTimeFormat('he-IL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

const formatDate = (value: string) => dateFormatter.format(new Date(value))

const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  TRAINING: 'אימון',
  EMPLOYMENT: 'תעסוקה',
  TRAINING_COURSE: 'השתלמות',
}

const classifyActivity = (activity: Activity, now = new Date()) => {
  if (activity.status === 'ACTIVE') {
    return 'current' as const
  }

  if (activity.status === 'CANCELLED' || activity.status === 'COMPLETED' || new Date(activity.endDate) <= now) {
    return 'historical' as const
  }

  if (new Date(activity.startDate) >= now) {
    return 'planned' as const
  }

  return 'historical' as const
}

const sortByStartDateAsc = (a: Activity, b: Activity) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
const sortByEndDateDesc = (a: Activity, b: Activity) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()

function ActivitySection({
  title,
  activities,
  emptyText,
  onOpen,
}: {
  title: string
  activities: Activity[]
  emptyText: string
  onOpen: (activityId: string) => void
}) {
  return (
    <section aria-labelledby={`${title}-title`} className="space-y-3">
      <div>
        <h2 id={`${title}-title`} className="text-lg font-semibold text-foreground">{title}</h2>
      </div>

      {activities.length === 0 ? (
        <Card className="shadow-none">
          <CardContent className="px-4 py-6 text-sm text-muted sm:px-5">{emptyText}</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              onOpen={onOpen}
              dataTestId={`activity-card-${activity.id}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function ActiveActivityNotice({ activity, onOpen }: { activity: Activity; onOpen: (activityId: string) => void }) {
  return (
    <Card className="border-primary/40 shadow-none">
      <CardContent className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <p className="text-xs font-medium text-primary">פעילות נוכחית</p>
          <p className="mt-1 text-base font-semibold text-foreground">{activity.name}</p>
          <p className="mt-1 text-sm text-muted">{formatDate(activity.startDate)}-{formatDate(activity.endDate)}</p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge className="gap-1.5 border-primary/40 bg-primary-soft text-primary">
            <Radio className="h-3.5 w-3.5" />
            פעילה
          </Badge>
          <Button type="button" size="sm" variant="secondary" onClick={() => onOpen(activity.id)}>
            פתיחת תעסוקה
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ActivityItem({
  activity,
  onOpen,
  dataTestId,
}: {
  activity: Activity
  onOpen: (activityId: string) => void
  dataTestId?: string
}) {
  const isActive = activity.status === 'ACTIVE'
  const typeLabel = ACTIVITY_TYPE_LABELS[activity.type]

  return (
    <Card className={cn('min-w-0 shadow-none', isActive && 'border-primary/35')} data-testid={dataTestId}>
      <CardContent className="space-y-4 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="break-words text-base font-semibold text-foreground sm:text-lg">{activity.name}</h2>
              <Badge className="border-border bg-surface-elevated text-foreground">{typeLabel}</Badge>
            </div>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              {formatDate(activity.startDate)}-{formatDate(activity.endDate)}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {isActive ? <Badge className="border-primary/40 bg-primary-soft text-primary">פעילה כעת</Badge> : null}
            <StatusBadge value={activity.status} />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="button" size="sm" variant="secondary" onClick={() => onOpen(activity.id)}>
            פתיחת תעסוקה
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function ActivitiesPage() {
  const navigate = useNavigate()
  const activitiesQuery = useCompanyActivities()

  const activities = activitiesQuery.data ?? []
  const now = new Date()
  const currentActivities = activities.filter((activity) => activity.status === 'ACTIVE').sort(sortByStartDateAsc)
  const plannedActivities = activities
    .filter((activity) => activity.status !== 'ACTIVE' && activity.status !== 'CANCELLED' && new Date(activity.startDate) >= now)
    .sort(sortByStartDateAsc)
  const historicalActivities = activities
    .filter((activity) => activity.status === 'COMPLETED' || activity.status === 'CANCELLED' || new Date(activity.endDate) <= now)
    .filter((activity) => activity.status !== 'ACTIVE')
    .sort(sortByEndDateDesc)

  const visibleCurrent = currentActivities[0] ?? null
  const visiblePlanned = plannedActivities.filter((activity) => activity.id !== visibleCurrent?.id)
  const visibleHistorical = historicalActivities.filter((activity) => activity.id !== visibleCurrent?.id && !visiblePlanned.some((item) => item.id === activity.id))

  return (
    <>
      <PageHeader
        title="תעסוקות"
        description="ניהול תעסוקות הפלוגה ומעקב אחר מצב התעסוקה הפעילה."
        actions={
          <Button type="button" onClick={() => navigate('/activities/new')}>
            יצירת פעילות חדשה
          </Button>
        }
      />
      <ContentContainer className="space-y-5 pb-10">
        {activitiesQuery.isPending ? (
          <LoadingState title="טוען תעסוקות" description="רשימת התעסוקות נטענת כעת." />
        ) : activitiesQuery.isError ? (
          <ErrorState
            title="טעינת התעסוקות נכשלה"
            description="לא הצלחנו לטעון את רשימת התעסוקות. אפשר לנסות שוב."
            action={
              <Button type="button" variant="secondary" onClick={() => void activitiesQuery.refetch()}>
                ניסיון חוזר
              </Button>
            }
          />
        ) : activities.length === 0 ? (
          <EmptyState
            title="אין תעסוקות להצגה"
            description="לא הוגדרו עדיין תעסוקות לפלוגה."
            icon={<FolderOpen className="h-5 w-5" aria-hidden="true" />}
            action={
              <Button type="button" variant="secondary" onClick={() => navigate('/activities/new')}>
                יצירת פעילות חדשה
              </Button>
            }
          />
        ) : (
          <div className="space-y-5">
            {visibleCurrent ? (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">פעילות נוכחית</h2>
                <ActiveActivityNotice activity={visibleCurrent} onOpen={(activityId) => navigate(`/activities/${activityId}`)} />
              </div>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-2">
              <ActivitySection
                title="פעילויות בתכנון"
                activities={visiblePlanned}
                emptyText="אין פעילויות בתכנון"
                onOpen={(activityId) => navigate(`/activities/${activityId}`)}
              />
              <ActivitySection
                title="פעילויות היסטוריות"
                activities={visibleHistorical}
                emptyText="אין פעילויות היסטוריות"
                onOpen={(activityId) => navigate(`/activities/${activityId}`)}
              />
            </div>
          </div>
        )}
      </ContentContainer>
    </>
  )
}
