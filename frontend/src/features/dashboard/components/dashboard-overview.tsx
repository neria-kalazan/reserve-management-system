import { CalendarDays, BadgeCheck, Users, BriefcaseBusiness, Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import type { ActivityType } from '@/features/activities/types/activity'
import type { CompanyDashboardResponse } from '@/features/dashboard/types/dashboard'
import { EmptyState } from '@/shared/components/empty-state'
import { StatusBadge } from '@/shared/components/status-badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'

const dateFormatter = new Intl.DateTimeFormat('he-IL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

const formatDateRange = (startDate: string, endDate: string) => `${dateFormatter.format(new Date(startDate))}–${dateFormatter.format(new Date(endDate))}`

const ACTIVITY_DETAILS_LABELS: Record<ActivityType, string> = {
  TRAINING: 'לפרטי האימון',
  EMPLOYMENT: 'לפרטי התעסוקה',
  TRAINING_COURSE: 'לפרטי ההשתלמות',
}

type SectionHeadingProps = {
  id: string
  title: string
  description: string
}

function SectionHeading({ id, title, description }: SectionHeadingProps) {
  return (
    <div>
      <h2 id={id} className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
    </div>
  )
}

type MetricCardProps = {
  label: string
  value: number
  icon: typeof Users
}

function MetricCard({ label, value, icon: Icon }: MetricCardProps) {
  return (
    <Card className="min-w-0 shadow-none">
      <CardContent className="flex items-center gap-4 px-4 py-4 sm:px-5 sm:py-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
          <p className="mt-0.5 text-sm text-muted">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function SummaryList({
  title,
  description,
  items,
  emptyText,
}: {
  title: string
  description: string
  items: Array<{ name: string; count: number }>
  emptyText: string
}) {
  return (
    <section aria-labelledby={`${title}-title`}>
      <SectionHeading id={`${title}-title`} title={title} description={description} />
      <Card className="mt-4 shadow-none">
        <CardContent className="px-4 py-4 sm:px-5">
          {items.length > 0 ? (
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.name} className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">
                  <span className="text-sm text-foreground">{item.name}</span>
                  <span className="text-base font-semibold text-foreground">{item.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">{emptyText}</p>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

function RoleHolderList({
  title,
  description,
  items,
  emptyText,
}: {
  title: string
  description: string
  items: Array<{ role: string; holder: string }>
  emptyText: string
}) {
  return (
    <section aria-labelledby={`${title}-title`}>
      <SectionHeading id={`${title}-title`} title={title} description={description} />
      <Card className="mt-4 shadow-none">
        <CardContent className="px-4 py-4 sm:px-5">
          {items.length > 0 ? (
            <ol className="space-y-3">
              {items.map((item) => (
                <li key={`${item.role}-${item.holder}`} className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
                  {item.role} — {item.holder}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted">{emptyText}</p>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

function ActivityList({
  title,
  description,
  items,
  emptyText,
  onOpen,
}: {
  title: string
  description: string
  items: CompanyDashboardResponse['upcomingActivities']
  emptyText: string
  onOpen: (activityId: string) => void
}) {
  return (
    <section aria-labelledby={`${title}-title`}>
      <SectionHeading id={`${title}-title`} title={title} description={description} />
      <div className="mt-4 space-y-3">
        {items.length > 0 ? (
          items.map((activity) => (
            <Card key={activity.id} className="shadow-none">
              <CardContent className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-foreground">{activity.name}</p>
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted">
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                    <span>{formatDateRange(activity.startDate, activity.endDate)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge value={activity.status} />
                  <Button type="button" variant="secondary" size="sm" onClick={() => onOpen(activity.id)}>
                    {ACTIVITY_DETAILS_LABELS[activity.type] ?? 'לפרטי הפעילות'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState className="py-8" title={emptyText} description="" icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />} />
        )}
      </div>
    </section>
  )
}

export function DashboardOverview({
  dashboard,
  roleHolders,
  totals,
}: {
  dashboard: CompanyDashboardResponse
  roleHolders: Array<{ role: string; holder: string }>
  totals: { totalPersonnel: number; totalUnits: number; totalRoles: number; totalQualifications: number }
}) {
  const navigate = useNavigate()
  const { companySummary, upcomingActivities, recentActivities } = dashboard

  return (
    <div className="space-y-8 md:space-y-10">
      <section aria-labelledby="company-overview-title">
        <SectionHeading id="company-overview-title" title="סקירת הפלוגה" description="מבט כללי על כוח האדם, המסגרות והפעילויות של הפלוגה." />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="כוח אדם פעילים" value={companySummary.totalSoldiers ?? totals.totalPersonnel} icon={Users} />
          <MetricCard label="מסגרות" value={totals.totalUnits} icon={Shield} />
          <MetricCard label="תפקידים" value={totals.totalRoles} icon={BriefcaseBusiness} />
          <MetricCard label="הסמכות" value={totals.totalQualifications} icon={BadgeCheck} />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <ActivityList
          title="פעילויות קרובות"
          description="רשימת הפעילויות הקרובות בתכנון"
          items={upcomingActivities}
          emptyText="אין פעילויות קרובות"
          onOpen={(activityId) => navigate(`/activities/${activityId}`)}
        />
        <ActivityList
          title="פעילות אחרונה"
          description="רשימת פעילויות שנערכו לאחרונה"
          items={recentActivities}
          emptyText="אין פעילות אחרונה"
          onOpen={(activityId) => navigate(`/activities/${activityId}`)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SummaryList
          title="הסמכות"
          description="כמות כוח אדם לפי הסמכה"
          items={companySummary.qualificationCounts}
          emptyText="אין נתוני הסמכות"
        />
        <RoleHolderList
          title="מחזיקי תפקידים"
          description="שמות בעלי התפקידים הרלוונטיים בפלוגה"
          items={roleHolders}
          emptyText="אין מחזיקי תפקידים להצגה"
        />
      </div>

    </div>
  )
}