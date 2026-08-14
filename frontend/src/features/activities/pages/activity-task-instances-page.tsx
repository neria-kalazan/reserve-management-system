import { CheckCircle2, TriangleAlert, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { ApiError } from '@/api/client'
import { ContentContainer } from '@/app/layout/content-container'
import { PageHeader } from '@/app/layout/page-header'
import { useActivityById } from '@/features/activities/queries/use-activities'
import {
  useActivityTaskInstances,
  useAvailableUsers,
  useCandidateEvaluation,
  useCompanyUsers,
  useCreateActivityTaskInstance,
  useCreateTaskInstanceAssignment,
  useDeleteActivityTaskInstance,
  useDeleteAssignment,
  useTaskInstanceAssignments,
  useTaskInstanceValidation,
  useUpdateActivityTaskInstance,
} from '@/features/activities/queries/use-activity-tasks'
import { ErrorState } from '@/shared/components/error-state'
import { LoadingState } from '@/shared/components/loading-state'
import { ValidationBadge } from '@/shared/components/status-badge'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Badge } from '@/shared/components/ui/badge'
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

function TaskInstanceAssignmentsList({ taskInstanceId }: { taskInstanceId: string }) {
  const assignmentsQuery = useTaskInstanceAssignments(taskInstanceId)
  const deleteAssignmentMutation = useDeleteAssignment()
  const [deletingAssignmentIds, setDeletingAssignmentIds] = useState<Record<string, boolean>>({})
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({})

  const handleDeleteAssignment = async (assignmentId: string) => {
    setDeleteErrors((current) => ({ ...current, [assignmentId]: '' }))
    setDeletingAssignmentIds((current) => ({ ...current, [assignmentId]: true }))

    try {
      await deleteAssignmentMutation.mutateAsync(assignmentId)
      setDeletingAssignmentIds((current) => ({ ...current, [assignmentId]: false }))
    } catch (error) {
      const message = isApiError(error) ? error.message : 'מחיקת השיבוץ נכשלה.'
      setDeleteErrors((current) => ({ ...current, [assignmentId]: message }))
      setDeletingAssignmentIds((current) => ({ ...current, [assignmentId]: false }))
    }
  }

  if (assignmentsQuery.isPending) {
    return (
      <div className="mt-3">
        <LoadingState title="טוען שיבוצים" description="רשימת המשתמשים המוקצים למופע נטענת כעת." />
      </div>
    )
  }

  if (assignmentsQuery.isError) {
    return (
      <div className="mt-3">
        <ErrorState
          title="טעינת שיבוצים נכשלה"
          description="לא הצלחנו לטעון את רשימת המשתמשים המוקצים למופע. אפשר לנסות שוב."
          action={
            <Button type="button" variant="secondary" onClick={() => void assignmentsQuery.refetch()}>
              ניסיון חוזר
            </Button>
          }
        />
      </div>
    )
  }

  const assignments = assignmentsQuery.data ?? []

  if (assignments.length === 0) {
    return (
      <div
        data-testid="task-instance-assignments"
        className="mt-3 rounded-md border border-dashed border-border bg-surface px-3 py-5 text-center text-sm text-muted"
      >
        אין משתמשים מוקצים כרגע למופע הזה.
      </div>
    )
  }

  return (
    <div data-testid="task-instance-assignments" className="mt-3 space-y-2">
      <p className="text-sm font-medium text-foreground">שיבוצים נוכחיים</p>
      <div className="space-y-2">
        {assignments.map((assignment) => {
          const user = assignment.user

          return (
            <div key={assignment.id} className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="font-medium break-words text-right">
                    {user.firstName} {user.lastName}
                  </div>
                </div>
                <Badge className={user.isActive ? 'border-success/30 bg-success-soft text-success' : 'border-border-strong bg-border text-muted-foreground'}>
                  {user.isActive ? 'פעיל' : 'לא פעיל'}
                </Badge>
              </div>

              <div className="mt-1 space-y-1 text-xs text-muted text-right">
                <div className="break-words">מספר אישי: {user.personalNumber}</div>
                {user.phone ? <div className="break-words">טלפון: {user.phone}</div> : null}
                {user.email ? <div className="break-words">אימייל: {user.email}</div> : null}
              </div>

              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => void handleDeleteAssignment(assignment.id)}
                  disabled={deleteAssignmentMutation.isPending || Boolean(deletingAssignmentIds[assignment.id])}
                  aria-busy={deleteAssignmentMutation.isPending || Boolean(deletingAssignmentIds[assignment.id])}
                >
                  {deleteAssignmentMutation.isPending || deletingAssignmentIds[assignment.id] ? 'מוחק…' : 'מחיקת שיבוץ'}
                </Button>
              </div>

              {deleteErrors[assignment.id] ? (
                <Alert className="mt-2 border-danger/30 bg-danger-soft/30 px-3 py-2">
                  <AlertTitle className="text-xs text-danger">מחיקת השיבוץ נכשלה</AlertTitle>
                  <AlertDescription className="text-xs text-danger/80">{deleteErrors[assignment.id]}</AlertDescription>
                </Alert>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TaskInstanceCandidateList({ taskInstanceId }: { taskInstanceId: string }) {
  const availableUsersQuery = useAvailableUsers(taskInstanceId)

  if (availableUsersQuery.isPending) {
    return (
      <div className="mt-3">
        <LoadingState title="טוען מועמדים" description="רשימת המועמדים הזמינים נטענת כעת." />
      </div>
    )
  }

  if (availableUsersQuery.isError) {
    return (
      <div className="mt-3">
        <ErrorState
          title="טעינת מועמדים נכשלה"
          description="לא הצלחנו לטעון את רשימת המועמדים הזמינים. אפשר לנסות שוב."
          action={
            <Button type="button" variant="secondary" onClick={() => void availableUsersQuery.refetch()}>
              ניסיון חוזר
            </Button>
          }
        />
      </div>
    )
  }

  const availableUsers = availableUsersQuery.data ?? []

  if (availableUsers.length === 0) {
    return (
      <div className="mt-3 rounded-md border border-dashed border-border bg-surface px-3 py-5 text-center text-sm text-muted">
        אין מועמדים זמינים כרגע עבור המופע הזה.
      </div>
    )
  }

  return (
    <div className="mt-3 space-y-2">
      <p className="text-sm font-medium text-foreground">מועמדים זמינים</p>
      <div className="space-y-2">
        {availableUsers.map((user) => (
          <div key={user.id} className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="font-medium break-words text-right">
                  {user.firstName} {user.lastName}
                </div>
              </div>
              <div className="text-xs text-muted text-right">
                {user.isActive ? 'פעיל' : 'לא פעיל'}
              </div>
            </div>
            <div className="mt-1 space-y-1 text-xs text-muted text-right">
              {user.phone ? <div className="break-words">טלפון: {user.phone}</div> : null}
              {user.email ? <div className="break-words">אימייל: {user.email}</div> : null}
              <div className="break-words">מספר אישי: {user.personalNumber}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CandidateEvaluationBadge({ severity }: { severity: 'NORMAL' | 'WARNING' | 'CRITICAL' }) {
  const config = {
    NORMAL: { label: 'תקין', className: 'border-success/30 bg-success-soft text-success' },
    WARNING: { label: 'אזהרה', className: 'border-warning/30 bg-warning-soft text-warning' },
    CRITICAL: { label: 'קריטי', className: 'border-danger/30 bg-danger-soft text-danger' },
  }[severity]

  return <Badge className={config.className}>{config.label}</Badge>
}

function TaskInstanceCandidateSearch({
  taskInstanceId,
  companyId,
}: {
  taskInstanceId: string
  companyId: string | undefined
}) {
  const [searchText, setSearchText] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [assignmentError, setAssignmentError] = useState<string | undefined>(undefined)
  const [assignmentSuccess, setAssignmentSuccess] = useState(false)
  const companyUsersQuery = useCompanyUsers(companyId)
  const assignmentMutation = useCreateTaskInstanceAssignment(taskInstanceId)
  const evaluationQuery = useCandidateEvaluation(taskInstanceId, selectedUserId ?? undefined)

  const matchingUsers = useMemo(() => {
    const users = companyUsersQuery.data ?? []
    const normalizedSearch = searchText.trim().toLocaleLowerCase()

    if (!normalizedSearch) {
      return users
    }

    return users.filter((user) => {
      const candidateText = [user.firstName, user.lastName, user.email, user.phone, user.personalNumber]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase()

      return candidateText.includes(normalizedSearch)
    })
  }, [companyUsersQuery.data, searchText])

  const selectedUser = companyUsersQuery.data?.find((user) => user.id === selectedUserId) ?? null

  const handleAssign = async () => {
    if (!selectedUserId) {
      return
    }

    setAssignmentError(undefined)
    setAssignmentSuccess(false)

    try {
      await assignmentMutation.mutateAsync({ userId: selectedUserId })
      setAssignmentSuccess(true)
    } catch (error) {
      const message = isApiError(error)
        ? error.message
        : 'הקצאת המועמד נכשלה'
      setAssignmentError(message)
    }
  }

  const isSearchEmpty = matchingUsers.length === 0 && searchText.trim().length > 0

  return (
    <div className="mt-3 space-y-3 rounded-md border border-border bg-surface px-3 py-3">
      {companyUsersQuery.isPending ? (
        <LoadingState title="טוען משתמשי חברה" description="רשימת המשתמשים של החברה נטענת כעת." />
      ) : companyUsersQuery.isError ? (
        <ErrorState
          title="טעינת משתמשי חברה נכשלה"
          description="לא הצלחנו לטעון את רשימת המשתמשים של החברה. אפשר לנסות שוב."
          action={
            <Button type="button" variant="secondary" onClick={() => void companyUsersQuery.refetch()}>
              ניסיון חוזר
            </Button>
          }
        />
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor={`candidate-search-${taskInstanceId}`}>חיפוש מועמד</Label>
            <Input
              id={`candidate-search-${taskInstanceId}`}
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="חיפוש לפי שם, מייל, טלפון או מספר אישי"
            />
          </div>

          {isSearchEmpty ? (
            <div className="rounded-md border border-dashed border-border bg-surface px-3 py-3 text-sm text-muted">
              לא נמצאו משתמשים התואמים את החיפוש.
            </div>
          ) : null}

          {matchingUsers.length > 0 ? (
            <div className="space-y-2">
              {matchingUsers.map((user) => {
                const isSelected = user.id === selectedUserId

                return (
                  <div key={user.id} className="flex flex-col gap-3 rounded-md border border-border bg-surface px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground break-words text-right">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="mt-1 text-xs text-muted text-right break-words">
                        {user.email ? `${user.email} · ` : ''}
                        {user.personalNumber}
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant={isSelected ? 'secondary' : 'primary'}
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        setSelectedUserId(user.id)
                        setAssignmentError(undefined)
                        setAssignmentSuccess(false)
                      }}
                    >
                      {isSelected ? 'נבחר' : `בחר ${user.firstName} ${user.lastName}`}
                    </Button>
                  </div>
                )
              })}
            </div>
          ) : null}
        </>
      )}

      {selectedUser ? (
        <div className="rounded-md border border-border bg-surface px-3 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">מועמד נבחר</p>
              <p className="text-sm text-muted">{selectedUser.firstName} {selectedUser.lastName}</p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={() => setSelectedUserId(null)}>
              סילוק בחירה
            </Button>
          </div>

          {!selectedUserId ? null : (
            <div className="mt-3 flex flex-col gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => void handleAssign()}
                disabled={assignmentMutation.isPending}
                aria-busy={assignmentMutation.isPending}
              >
                הקצה מועמד
              </Button>

              {assignmentMutation.isPending ? (
                <div className="text-xs text-muted">מוכן להקצאה…</div>
              ) : null}

              {assignmentSuccess ? (
                <Alert className="border-success/30 bg-success-soft/30 px-3 py-2">
                  <AlertTitle className="text-xs text-success">ההקצאה הצליחה</AlertTitle>
                </Alert>
              ) : null}

              {assignmentError ? (
                <Alert className="border-danger/30 bg-danger-soft/30 px-3 py-2">
                  <AlertTitle className="text-xs text-danger">הקצאת המועמד נכשלה</AlertTitle>
                  <AlertDescription className="text-xs text-danger/80">{assignmentError}</AlertDescription>
                </Alert>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {!selectedUserId ? null : evaluationQuery.isPending ? (
        <LoadingState title="בודק הערכת מועמד…" description="הערכת המועמד מתקבלת מהשרת." />
      ) : evaluationQuery.isError ? (
        <ErrorState
          title="הערכת מועמד נכשלה"
          description="לא הצלחנו לטעון את הערכת המועמד. אפשר לנסות שוב."
          action={
            <Button type="button" variant="secondary" onClick={() => void evaluationQuery.refetch()}>
              ניסיון חוזר
            </Button>
          }
        />
      ) : evaluationQuery.data ? (
        <div className="space-y-3 rounded-md border border-border bg-surface px-3 py-3">
          <div className="flex flex-col gap-2 text-right sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-foreground">הערכת מועמד</p>
            <CandidateEvaluationBadge severity={evaluationQuery.data.severity} />
          </div>

          {evaluationQuery.data.reasonMessages.length > 0 ? (
            <ul className="space-y-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted">
              {evaluationQuery.data.reasonMessages.map((message, index) => (
                <li key={`${message}-${index}`} className="flex items-start gap-2 text-right">
                  <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                  <span>{message}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-md border border-dashed border-border bg-surface px-3 py-2 text-sm text-muted">
              אין סיבות שהוחזרו מהשרת.
            </div>
          )}
        </div>
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
                      <TaskInstanceAssignmentsList taskInstanceId={taskInstance.id} />
                      <TaskInstanceCandidateList taskInstanceId={taskInstance.id} />
                      <TaskInstanceCandidateSearch taskInstanceId={taskInstance.id} companyId={activityQuery.data?.companyId} />
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
