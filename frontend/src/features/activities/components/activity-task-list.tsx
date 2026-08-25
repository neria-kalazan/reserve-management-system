import { ListTodo } from 'lucide-react'

import { ErrorState } from '@/shared/components/error-state'
import { LoadingState } from '@/shared/components/loading-state'
import { ValidationBadge } from '@/shared/components/status-badge'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'

import type { ActivityTask, ActivityTaskRequirements } from '@/features/activities/api/activity-tasks'

function TaskListRow({
  task,
  requirements,
  roleNames,
  qualificationNames,
  onEdit,
}: {
  task: ActivityTask
  requirements?: ActivityTaskRequirements
  roleNames?: Record<string, string>
  qualificationNames?: Record<string, string>
  onEdit?: ((task: ActivityTask) => void) | undefined
}) {
  const manpowerQuantity = requirements?.manpower?.quantity ?? null
  const roleRequirements = requirements?.roles ?? []
  const qualificationRequirements = requirements?.qualifications ?? []

  const renderRequirementState = (required: boolean) => (
    <ValidationBadge state={required ? 'error' : 'warning'} text={required ? 'הכרחי' : 'לא הכרחי'} />
  )

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-surface px-3 py-3 text-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium text-foreground">{task.name}</p>
            {manpowerQuantity !== null ? (
              <Badge className="border-primary/30 bg-primary-soft text-primary">
                סד&quot;כ: {manpowerQuantity} לוחמים
              </Badge>
            ) : null}
          </div>
          {task.description ? (
            <p className="mt-1 text-xs leading-5 text-muted">{task.description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {onEdit ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => onEdit(task)}>
              עריכה
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 rounded-md border border-border bg-surface-elevated px-3 py-3 text-xs text-muted md:grid-cols-2">
        <div className="space-y-2">
          <p className="font-medium text-foreground">דרישות תפקידים:</p>
          {roleRequirements.length > 0 ? (
            <div className="space-y-2">
              {roleRequirements.map((entry) => (
                <div key={`${task.id}-role-${entry.roleId}`} className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-2 py-1.5">
                  <div className="min-w-0">
                    <p className="truncate text-foreground">{(roleNames && roleNames[entry.roleId]) ?? entry.roleId}</p>
                    <p className="text-[11px] text-muted">כמות: {entry.quantity}</p>
                  </div>
                  {renderRequirementState(entry.required)}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted">אין דרישות תפקידים.</p>
          )}
        </div>

        <div className="space-y-2">
          <p className="font-medium text-foreground">דרישות הכשרות:</p>
          {qualificationRequirements.length > 0 ? (
            <div className="space-y-2">
              {qualificationRequirements.map((entry) => (
                <div key={`${task.id}-qualification-${entry.qualificationId}`} className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-2 py-1.5">
                  <div className="min-w-0">
                    <p className="truncate text-foreground">{(qualificationNames && qualificationNames[entry.qualificationId]) ?? entry.qualificationId}</p>
                    <p className="text-[11px] text-muted">כמות: {entry.quantity}</p>
                  </div>
                  {renderRequirementState(entry.required)}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted">אין דרישות הכשרות.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export function ActivityTaskList({
  tasks,
  taskRequirements,
  roleNames,
  qualificationNames,
  isPending,
  isError,
  error,
  refetch,
  onCreate,
  onEdit,
}: {
  tasks: ActivityTask[] | undefined
  taskRequirements?: Record<string, ActivityTaskRequirements | undefined>
  roleNames?: Record<string, string>
  qualificationNames?: Record<string, string>
  isPending: boolean
  isError: boolean
  error?: { status?: number; message?: string }
  refetch?: () => void
  onCreate?: () => void
  onEdit?: (task: ActivityTask) => void
}) {
  if (isPending) {
    return (
      <LoadingState title="טוען משימות" description="רשימת המשימות נטענת כעת." />
    )
  }

  if (isError) {
    return (
      <ErrorState
        title="טעינת המשימות נכשלה"
        description={error?.message ?? 'לא הצלחנו לטעון את רשימת המשימות.'}
        action={
          refetch ? (
            <Button type="button" variant="secondary" onClick={() => void refetch()}>
              ניסיון חוזר
            </Button>
          ) : null
        }
      />
    )
  }

  return (
    <Card>
      <CardHeader className="px-4 py-4 sm:px-5">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListTodo className="h-4 w-4" aria-hidden="true" />
            משימות
          </CardTitle>
          {onCreate ? (
            <Button type="button" variant="secondary" onClick={onCreate}>
              יצירת משימה
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4 sm:px-5 sm:pb-5">
        {tasks && tasks.length > 0 ? (
          tasks.map((task) => (
            <TaskListRow
              key={task.id}
              task={task}
              requirements={taskRequirements?.[task.id]}
              roleNames={roleNames}
              qualificationNames={qualificationNames}
              onEdit={onEdit}
            />
          ))
        ) : (
          <div className="rounded-md border border-dashed border-border bg-surface px-3 py-8 text-center text-sm text-muted">
            אין משימות להצגה לפעילות זו.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
