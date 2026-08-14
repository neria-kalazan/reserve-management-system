import { CheckCircle2, TriangleAlert, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { ApiError } from '@/api/client'
import { ContentContainer } from '@/app/layout/content-container'
import { PageHeader } from '@/app/layout/page-header'
import { useActivityById } from '@/features/activities/queries/use-activities'
import {
  useActivityTaskInstances,
  useCreateActivityTaskInstance,
  useDeleteActivityTaskInstance,
  useTaskInstanceValidation,
  useUpdateActivityTaskInstance,
} from '@/features/activities/queries/use-activity-tasks'
import { ErrorState } from '@/shared/components/error-state'
import { LoadingState } from '@/shared/components/loading-state'
import { ValidationBadge } from '@/shared/components/status-badge'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'

interface TaskInstanceFormState {
  title: string
  startTime: string
  endTime: string
}

const emptyForm = (): TaskInstanceFormState => ({
  title: '',
  startTime: '',
  endTime: '',
})

const isApiError = (value: unknown): value is ApiError => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    typeof (value as { status?: unknown }).status === 'number'
  )
}

const dateTimeFormatter = new Intl.DateTimeFormat('he-IL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
})

const formatDateTime = (value: string) => dateTimeFormatter.format(new Date(value))

function TaskInstanceValidationStatus({ taskInstanceId }: { taskInstanceId: string }) {
  const validationQuery = useTaskInstanceValidation(taskInstanceId)

  if (validationQuery.isPending) {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-muted">
        <CheckCircle2 className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
        <span>בודק תקינות…</span>
      </div>
    )
  }

  if (validationQuery.isError) {
    return (
      <Alert className="mt-3 border-danger/30 bg-danger-soft/40 px-3 py-3">
        <AlertTitle className="text-xs text-danger">בדיקת תקינות נכשלה</AlertTitle>
        <AlertDescription className="text-xs text-danger/80">
          לא ניתן לטעון את מצב התקינות של המופע כרגע.
        </AlertDescription>
      </Alert>
    )
  }

  const validation = validationQuery.data
  if (!validation) {
    return null
  }

  if (validation.summary.isValid) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ValidationBadge state="valid" text="תקין" />
      </div>
    )
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <ValidationBadge state="error" text="לא תקין" />
      </div>

      {validation.requiredErrors.length > 0 ? (
        <ul className="space-y-1 rounded-md border border-danger/20 bg-danger-soft/20 p-2 text-xs text-danger">
          {validation.requiredErrors.map((issue, index) => (
            <li key={`${issue.type}-${issue.message}-${index}`} className="flex items-start gap-2">
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{issue.message}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {validation.warnings.length > 0 ? (
        <ul className="space-y-1 rounded-md border border-warning/20 bg-warning-soft/20 p-2 text-xs text-warning">
          {validation.warnings.map((issue, index) => (
            <li key={`${issue.type}-${issue.message}-${index}`} className="flex items-start gap-2">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{issue.message}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function ActivityTaskInstancesPage() {
  const navigate = useNavigate()
  const { activityId, taskId } = useParams<{ activityId: string; taskId: string }>()
  const activityQuery = useActivityById(activityId)
  const taskInstancesQuery = useActivityTaskInstances(taskId)
  const createMutation = useCreateActivityTaskInstance(taskId)
  const updateMutation = useUpdateActivityTaskInstance()
  const deleteMutation = useDeleteActivityTaskInstance()

  const [form, setForm] = useState<TaskInstanceFormState>(emptyForm())
  const [saveError, setSaveError] = useState<string | undefined>(undefined)
  const [editingId, setEditingId] = useState<string | null>(null)

  const taskInstances = useMemo(() => taskInstancesQuery.data ?? [], [taskInstancesQuery.data])

  const onFieldChange = <K extends keyof TaskInstanceFormState>(field: K, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setSaveError(undefined)
  }

  const resetForm = () => {
    setForm(emptyForm())
    setEditingId(null)
    setSaveError(undefined)
  }

  const onCreate = async () => {
    const title = form.title.trim()
    if (!title || !form.startTime || !form.endTime) {
      setSaveError('יש למלא שם, שעת התחלה ושעת סיום.')
      return
    }

    try {
      await createMutation.mutateAsync({
        title,
        startTime: form.startTime,
        endTime: form.endTime,
      })
      resetForm()
    } catch (error) {
      const message = isApiError(error)
        ? error.message
        : 'לא הצלחנו ליצור את מופע המשימה.'
      setSaveError(message)
    }
  }

  const onEdit = (taskInstance: { id: string; title: string; startTime: string; endTime: string }) => {
    setEditingId(taskInstance.id)
    setForm({
      title: taskInstance.title,
      startTime: taskInstance.startTime,
      endTime: taskInstance.endTime,
    })
    setSaveError(undefined)
  }

  const onUpdate = async () => {
    if (!editingId) {
      return
    }

    const title = form.title.trim()
    if (!title || !form.startTime || !form.endTime) {
      setSaveError('יש למלא שם, שעת התחלה ושעת סיום.')
      return
    }

    try {
      await updateMutation.mutateAsync({
        taskInstanceId: editingId,
        body: {
          title,
          startTime: form.startTime,
          endTime: form.endTime,
        },
      })
      resetForm()
    } catch (error) {
      const message = isApiError(error)
        ? error.message
        : 'לא הצלחנו לעדכן את מופע המשימה.'
      setSaveError(message)
    }
  }

  const onDelete = async (taskInstanceId: string) => {
    const confirmed = window.confirm('האם למחוק את מופע המשימה?')
    if (!confirmed) {
      return
    }

    try {
      await deleteMutation.mutateAsync(taskInstanceId)
    } catch (error) {
      const message = isApiError(error)
        ? error.message
        : 'לא הצלחנו למחוק את מופע המשימה.'
      setSaveError(message)
    }
  }

  if (!activityId || !taskId) {
    return (
      <>
        <PageHeader title="מופעי משימה" description="לא התקבלו מזהים תקינים." />
        <ContentContainer className="pb-10">
          <ErrorState
            title="מזהה משימה חסר"
            description="לא ניתן לטעון מופעים בלי מזהה משימה תקין."
            action={
              <Button type="button" variant="secondary" onClick={() => navigate('/activities')}>
                חזרה לרשימת תעסוקות
              </Button>
            }
          />
        </ContentContainer>
      </>
    )
  }

  const isLoading = activityQuery.isPending || taskInstancesQuery.isPending
  const isError = activityQuery.isError || taskInstancesQuery.isError

  return (
    <>
      <PageHeader
        title={activityQuery.data?.name ?? 'מופעי משימה'}
        description="ניהול מופעי המשימה עבור משימה נבחרת."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate(`/activities/${activityId}`)}>
              חזרה למשימה
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate(`/activities/${activityId}`)}>
              חזרה לפרטי תעסוקה
            </Button>
          </div>
        }
      />

      <ContentContainer className="space-y-5 pb-10">
        {isLoading ? (
          <LoadingState title="טוען מופעים" description="מופעי המשימה נטענים כעת." />
        ) : isError ? (
          <ErrorState
            title="טעינת מופעים נכשלה"
            description="לא הצלחנו לטעון את המופעים של המשימה. אפשר לנסות שוב."
            action={
              <Button type="button" variant="secondary" onClick={() => void taskInstancesQuery.refetch()}>
                ניסיון חוזר
              </Button>
            }
          />
        ) : (
          <>
            <Card>
              <CardHeader className="px-4 py-4 sm:px-5">
                <CardTitle className="text-base">מופע חדש</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-5 sm:px-5">
                {saveError ? <ErrorState title="השמירה נכשלה" description={saveError} /> : null}

                <div className="space-y-2">
                  <Label htmlFor="task-instance-title">שם המופע</Label>
                  <Input
                    id="task-instance-title"
                    value={form.title}
                    onChange={(event) => onFieldChange('title', event.target.value)}
                    placeholder="לדוגמה: משמרת בוקר"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="task-instance-start">התחלה</Label>
                    <Input
                      id="task-instance-start"
                      type="datetime-local"
                      value={form.startTime}
                      onChange={(event) => onFieldChange('startTime', event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="task-instance-end">סיום</Label>
                    <Input
                      id="task-instance-end"
                      type="datetime-local"
                      value={form.endTime}
                      onChange={(event) => onFieldChange('endTime', event.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  {editingId ? (
                    <>
                      <Button type="button" variant="secondary" onClick={resetForm}>
                        ביטול
                      </Button>
                      <Button type="button" onClick={() => void onUpdate()}>
                        שמירת מופע
                      </Button>
                    </>
                  ) : (
                    <Button type="button" onClick={() => void onCreate()} disabled={createMutation.isPending} loading={createMutation.isPending}>
                      יצירת מופע
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="px-4 py-4 sm:px-5">
                <CardTitle className="text-base">מופעים</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-5 sm:px-5">
                {taskInstances.length > 0 ? (
                  taskInstances.map((taskInstance) => (
                    <div key={taskInstance.id} className="flex flex-col gap-3 rounded-md border border-border bg-surface px-3 py-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{taskInstance.title}</p>
                          <p className="mt-1 text-xs text-muted">
                            {formatDateTime(taskInstance.startTime)} – {formatDateTime(taskInstance.endTime)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="secondary" size="sm" onClick={() => onEdit(taskInstance)}>
                            עריכה
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => void onDelete(taskInstance.id)}
                            disabled={deleteMutation.isPending}
                          >
                            מחיקה
                          </Button>
                        </div>
                      </div>

                      <TaskInstanceValidationStatus taskInstanceId={taskInstance.id} />
                    </div>
                  ))
                ) : (
                  <div className="rounded-md border border-dashed border-border bg-surface px-3 py-8 text-center text-sm text-muted">
                    אין מופעים להצגה למשימה זו.
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </ContentContainer>
    </>
  )
}
