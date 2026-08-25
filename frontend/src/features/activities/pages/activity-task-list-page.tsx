import { ListTodo } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'

import type { ApiError } from '@/api/client'
import { ContentContainer } from '@/app/layout/content-container'
import { PageHeader } from '@/app/layout/page-header'
import { ActivityTaskList } from '@/features/activities/components/activity-task-list'
import { getActivityTaskRequirements } from '@/features/activities/api/activity-tasks'
import { activityTaskRequirementsQueryKey, useActivityTasks } from '@/features/activities/queries/use-activity-tasks'
import { useActivityById } from '@/features/activities/queries/use-activities'
import { useCompanyQualifications } from '@/features/qualifications/queries/use-qualifications'
import { useCompanyRoles } from '@/features/roles/queries/use-roles'
import { ErrorState } from '@/shared/components/error-state'
import { LoadingState } from '@/shared/components/loading-state'
import { Button } from '@/shared/components/ui/button'

const isApiError = (value: unknown): value is ApiError => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    typeof (value as { status?: unknown }).status === 'number'
  )
}

export function ActivityTaskListPage() {
  const navigate = useNavigate()
  const { activityId } = useParams<{ activityId: string }>()
  const activityQuery = useActivityById(activityId)
  const tasksQuery = useActivityTasks(activityId)
  const rolesQuery = useCompanyRoles(activityQuery.data?.companyId)
  const qualificationsQuery = useCompanyQualifications(activityQuery.data?.companyId)

  const requirementQueries = useQueries({
    queries: (tasksQuery.data ?? []).map((task) => ({
      queryKey: activityTaskRequirementsQueryKey(task.id),
      queryFn: () => getActivityTaskRequirements(task.id),
      enabled: Boolean(task.id),
    })),
  })

  const taskRequirements = useMemo(
    () =>
      Object.fromEntries(
        (tasksQuery.data ?? []).map((task, index) => [task.id, requirementQueries[index]?.data]),
      ),
    [requirementQueries, tasksQuery.data],
  )

  const roleNames = useMemo(
    () => Object.fromEntries((rolesQuery.data?.items ?? []).map((role) => [role.id, role.name])),
    [rolesQuery.data],
  )

  const qualificationNames = useMemo(
    () => Object.fromEntries((qualificationsQuery.data?.items ?? []).map((qualification) => [qualification.id, qualification.name])),
    [qualificationsQuery.data],
  )

  const isNotFound = activityQuery.isError && isApiError(activityQuery.error) && activityQuery.error.status === 404

  if (!activityId) {
    return (
      <>
        <PageHeader title="משימות פעילות" description="לא התקבל מזהה פעילות חוקי." />
        <ContentContainer className="pb-10">
          <ErrorState
            title="מזהה פעילות חסר"
            description="לא ניתן לטעון את רשימת המשימות בלי מזהה פעילות תקין."
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
        title={activityQuery.data?.name ?? 'משימות פעילות'}
        description="רשימת משימות ההגדרה של הפעילות הנוכחית."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(`/activities/${activityId}`)}
            >
              חזרה לפרטי פעילות
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(`/activities/${activityId}/tasks/new`)}
            >
              יצירת משימה
            </Button>
          </div>
        }
      />

      <ContentContainer className="space-y-5 pb-10">
        {activityQuery.isPending ? (
          <LoadingState title="טוען פעילות" description="פרטי הפעילות נטענים כעת." />
        ) : activityQuery.isError ? (
          <ErrorState
            title={isNotFound ? 'הפעילות לא נמצאה' : 'טעינת הפעילות נכשלה'}
            description={
              isNotFound
                ? 'לא נמצאה פעילות עם המזהה שנבחר. אפשר לחזור לרשימת הפעילויות.'
                : 'לא הצלחנו לטעון את פרטי הפעילות. אפשר לנסות שוב.'
            }
            action={
              <Button type="button" variant="secondary" onClick={() => void activityQuery.refetch()}>
                ניסיון חוזר
              </Button>
            }
          />
        ) : (
          <>
            <div className="rounded-lg border border-border bg-surface-elevated px-4 py-3 text-sm text-muted">
              <span className="font-medium text-foreground">משימות פעילות</span>
              <span className="mr-2">•</span>
              <span>רשימת הגדרות המשימות של הפעילות הנוכחית</span>
            </div>

            <ActivityTaskList
              tasks={tasksQuery.data}
              taskRequirements={taskRequirements}
              roleNames={roleNames}
              qualificationNames={qualificationNames}
              isPending={tasksQuery.isPending}
              isError={tasksQuery.isError}
              error={tasksQuery.error as { status?: number; message?: string } | undefined}
              refetch={() => void tasksQuery.refetch()}
              onCreate={() => navigate(`/activities/${activityId}/tasks/new`)}
              onEdit={(task) => navigate(`/activities/${activityId}/tasks/${task.id}/edit`)}
            />
          </>
        )}
      </ContentContainer>
    </>
  )
}
