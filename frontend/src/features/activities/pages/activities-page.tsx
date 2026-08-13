import { useNavigate } from 'react-router-dom'
import { CalendarDays, FolderOpen, Radio } from 'lucide-react'

import { ContentContainer } from '@/app/layout/content-container'
import { PageHeader } from '@/app/layout/page-header'
import { useCompanyActivities } from '@/features/activities/queries/use-activities'
import type { Activity } from '@/features/activities/types/activity'
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

function ActiveActivityNotice({ activity }: { activity: Activity }) {
  return (
    <Card className="border-primary/40">
      <CardContent className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <p className="text-xs font-medium text-primary">תעסוקה פעילה כעת</p>
          <p className="mt-1 text-base font-semibold text-foreground">{activity.name}</p>
          <p className="mt-1 text-sm text-muted">{formatDate(activity.startDate)}-{formatDate(activity.endDate)}</p>
        </div>
        <Badge className="gap-1.5 border-primary/40 bg-primary-soft text-primary">
          <Radio className="h-3.5 w-3.5" />
          פעילה
        </Badge>
      </CardContent>
    </Card>
  )
}

function ActivityItem({ activity, onOpen }: { activity: Activity; onOpen: (activityId: string) => void }) {
  const isActive = activity.status === 'ACTIVE'

  return (
    <Card className={cn('min-w-0', isActive && 'border-primary/35')}>
      <CardContent className="space-y-4 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="break-words text-base font-semibold text-foreground sm:text-lg">{activity.name}</h2>
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
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => onOpen(activity.id)}
          >
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
  const activeActivity = activities.find((activity) => activity.status === 'ACTIVE')

  return (
    <>
      <PageHeader
        title="תעסוקות"
        description="ניהול תעסוקות הפלוגה ומעקב אחר מצב התעסוקה הפעילה."
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
          />
        ) : (
          <div className="space-y-4">
            {activeActivity ? <ActiveActivityNotice activity={activeActivity} /> : null}

            <section aria-label="רשימת תעסוקות" className="grid gap-3">
              {activities.map((activity) => (
                <ActivityItem
                  key={activity.id}
                  activity={activity}
                  onOpen={(activityId) => navigate(`/activities/${activityId}`)}
                />
              ))}
            </section>
          </div>
        )}
      </ContentContainer>
    </>
  )
}
