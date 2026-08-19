import { ListTodo } from 'lucide-react'

import { ErrorState } from '@/shared/components/error-state'
import { LoadingState } from '@/shared/components/loading-state'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'

import type { ActivityTask } from '@/features/activities/api/activity-tasks'

function TaskListRow({
  task,
  onOpenRequirements,
  onOpenTaskInstances,
}: {
  task: ActivityTask
  onOpenRequirements?: ((task: ActivityTask) => void) | undefined
  onOpenTaskInstances?: ((task: ActivityTask) => void) | undefined
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-surface px-3 py-3 text-sm sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{task.name}</p>
        {task.description ? (
          <p className="mt-1 text-xs leading-5 text-muted">{task.description}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {onOpenTaskInstances ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => onOpenTaskInstances(task)}>
            מופעים
          </Button>
        ) : null}
        {onOpenRequirements ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => onOpenRequirements(task)}>
            דרישות
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export function ActivityTaskList({
  tasks,
  isPending,
  isError,
  error,
  refetch,
  onCreate,
  onOpenRequirements,
  onOpenTaskInstances,
}: {
  tasks: ActivityTask[] | undefined
  isPending: boolean
  isError: boolean
  error?: { status?: number; message?: string }
  refetch?: () => void
  onCreate?: () => void
  onOpenRequirements?: (task: ActivityTask) => void
  onOpenTaskInstances?: (task: ActivityTask) => void
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
              onOpenRequirements={onOpenRequirements}
              onOpenTaskInstances={onOpenTaskInstances}
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
