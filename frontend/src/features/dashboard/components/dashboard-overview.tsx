import {
  AlertTriangle,
  CalendarDays,
  CalendarOff,
  CheckCircle2,
  ClipboardCheck,
  ListChecks,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react'

import type {
  CompanyDashboardResponse,
  DashboardActiveActivity,
  DashboardValidationIssue,
} from '@/features/dashboard/types/dashboard'
import { EmptyState } from '@/shared/components/empty-state'
import { StatusBadge, ValidationBadge } from '@/shared/components/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import type { DailyStatus } from '@/types/status'

const dailyStatusOrder: DailyStatus[] = ['ACTIVE', 'HOLIDAY', 'SICK', 'RELEASED']

const dateFormatter = new Intl.DateTimeFormat('he-IL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

const formatDate = (value: string) => dateFormatter.format(new Date(value))

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

const formatErrorCount = (count: number) => count === 1 ? 'שגיאה אחת' : `${count} שגיאות`
const formatWarningCount = (count: number) => count === 1 ? 'אזהרה אחת' : `${count} אזהרות`

type MetricCardProps = {
  label: string
  value: number
  icon: typeof Users
  tone?: 'default' | 'warning' | 'danger'
}

function MetricCard({ label, value, icon: Icon, tone = 'default' }: MetricCardProps) {
  const toneClass = {
    default: 'bg-primary-soft text-primary',
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-danger-soft text-danger',
  }[tone]

  return (
    <Card className="min-w-0 shadow-none">
      <CardContent className="flex items-center gap-4 px-4 py-4 sm:px-5 sm:py-5">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${toneClass}`}>
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

function ActiveActivity({ activity }: { activity: DashboardActiveActivity | null }) {
  if (!activity) {
    return (
      <section aria-labelledby="active-activity-title">
        <SectionHeading id="active-activity-title" title="פעילות נוכחית" description="הפעילות הפעילה של הפלוגה" />
        <EmptyState
          className="mt-4 py-8"
          title="אין פעילות פעילה"
          description="לא הוגדרה כרגע פעילות פעילה לפלוגה."
          icon={<CalendarOff className="h-5 w-5" aria-hidden="true" />}
        />
      </section>
    )
  }

  return (
    <section aria-labelledby="active-activity-title">
      <SectionHeading id="active-activity-title" title="פעילות נוכחית" description="הפעילות הפעילה של הפלוגה" />
      <Card className="mt-4 overflow-hidden border-primary/30">
        <div className="h-1 bg-primary" />
        <CardContent className="grid gap-5 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center md:px-6">
          <div className="min-w-0">
            <p className="text-xs font-medium text-primary">פעילות פעילה</p>
            <h3 className="mt-1 break-words text-xl font-semibold text-foreground sm:text-2xl">
              {activity.name}
            </h3>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted" aria-hidden="true" />
                {formatDate(activity.startDate)}–{formatDate(activity.endDate)}
              </span>
            </div>
          </div>
          <div className="border-t border-border pt-4 sm:border-t-0 sm:border-r sm:pr-6 sm:pt-0">
            <p className="text-2xl font-semibold tabular-nums text-foreground">{activity.numberOfDays}</p>
            <p className="text-sm text-muted">ימים</p>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

function ManpowerSummary({ summary }: { summary: CompanyDashboardResponse['manpowerSummary'] }) {
  const statusEntries = dailyStatusOrder.flatMap((status) => {
    const count = summary.todayAvailabilitySummary.statusCounts[status]
    return count === undefined ? [] : [{ status, count }]
  })

  return (
    <section aria-labelledby="manpower-title">
      <SectionHeading id="manpower-title" title="תמונת כוח אדם" description="מצבת כוח האדם והסטטוסים להיום" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MetricCard label="משתמשים פעילים" value={summary.totalActiveUsers} icon={Users} />
        <MetricCard label="משתתפים בפעילות" value={summary.usersParticipatingInActivity} icon={UserCheck} />
      </div>
      <Card className="mt-3 shadow-none">
        <CardHeader className="px-4 pb-3 pt-4 sm:px-5">
          <CardTitle className="text-base">סטטוסים להיום</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-5">
          {statusEntries.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {statusEntries.map(({ status, count }) => (
                <div key={status} className="flex min-w-0 items-center justify-between gap-2 border-t border-border pt-3">
                  <StatusBadge value={status} />
                  <span className="text-base font-semibold tabular-nums text-foreground">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">אין דיווחי סטטוס להיום.</p>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

function TaskSummary({ summary }: { summary: CompanyDashboardResponse['tasksSummary'] }) {
  const validationCount = summary.validationIssuesSummary

  return (
    <section aria-labelledby="tasks-title">
      <SectionHeading id="tasks-title" title="תמונת משימות" description="מצב המשימות והשיבוץ בפעילות" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="מופעי משימה" value={summary.totalTaskInstances} icon={ListChecks} />
        <MetricCard
          label="משימות ללא שיבוץ"
          value={summary.unassignedTaskInstances}
          icon={UserX}
          tone={summary.unassignedTaskInstances > 0 ? 'warning' : 'default'}
        />
        <Card className="min-w-0 shadow-none sm:col-span-2 xl:col-span-1">
          <CardContent className="flex h-full flex-col justify-center gap-3 px-4 py-4 sm:px-5 sm:py-5">
            <p className="text-sm text-muted">בדיקות משימה</p>
            <div className="flex flex-wrap gap-2">
              <ValidationBadge state="error" text={formatErrorCount(validationCount.requiredErrorCount)} />
              <ValidationBadge state="warning" text={formatWarningCount(validationCount.warningCount)} />
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

function ValidationIssues({ issues }: { issues: DashboardValidationIssue[] }) {
  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-3 border-t border-border px-5 py-4 text-sm text-muted-foreground">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
        לא נמצאו בעיות אימות.
      </div>
    )
  }

  return (
    <ul className="divide-y divide-border border-t border-border">
      {issues.map((issue, index) => (
        <li key={`${issue.type}-${issue.message}-${index}`} className="flex items-start gap-3 px-5 py-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          <p className="min-w-0 break-words text-sm leading-6 text-muted-foreground">{issue.message}</p>
        </li>
      ))}
    </ul>
  )
}

function ValidationSummary({ validation }: { validation: CompanyDashboardResponse['validationIssues'] }) {
  const isValid = validation.requiredErrorCount === 0 && validation.warningCount === 0

  return (
    <section aria-labelledby="validation-title">
      <SectionHeading id="validation-title" title="תקינות ושגיאות" description="ריכוז בעיות האימות שדורשות תשומת לב" />
      <Card className="mt-4 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-4 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <ClipboardCheck className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
            <CardTitle className="text-base">מצב אימות</CardTitle>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {isValid ? (
              <ValidationBadge state="valid" text="תקין" />
            ) : (
              <>
                <ValidationBadge state="error" text={formatErrorCount(validation.requiredErrorCount)} />
                <ValidationBadge state="warning" text={formatWarningCount(validation.warningCount)} />
              </>
            )}
          </div>
        </CardHeader>
        <ValidationIssues issues={validation.issues} />
      </Card>
    </section>
  )
}

export function DashboardOverview({ dashboard }: { dashboard: CompanyDashboardResponse }) {
  return (
    <div className="space-y-8 md:space-y-10">
      <ActiveActivity activity={dashboard.activeActivity} />
      <ManpowerSummary summary={dashboard.manpowerSummary} />
      <TaskSummary summary={dashboard.tasksSummary} />
      <ValidationSummary validation={dashboard.validationIssues} />
    </div>
  )
}