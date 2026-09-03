import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { ApiError } from '@/api/client'
import { usePermissions } from '@/app/auth/use-permissions'
import type {
  SchedulingApprovalStatus,
  SchedulingDayCandidateEvaluationReason,
  SchedulingDayTaskInstance,
} from '@/features/activities/api/scheduling-day'
import { ContentContainer } from '@/app/layout/content-container'
import { PageHeader } from '@/app/layout/page-header'
import { useActivityById } from '@/features/activities/queries/use-activities'
import {
  useApproveActivitySchedulingDay,
  useActivitySchedulingDay,
  useOpenActivitySchedulingDay,
  useReturnActivitySchedulingDayToDraft,
  useSubmitActivitySchedulingDayForApproval,
} from '@/features/activities/queries/use-activity-scheduling-day'
import {
  useActivityTasks,
  useAvailableUsers,
  useCreateActivityTaskInstance,
  useCreateTaskInstanceAssignment,
  useDeleteActivityTaskInstance,
  useDeleteAssignment,
  useUpdateActivityTaskInstance,
} from '@/features/activities/queries/use-activity-tasks'
import { useCompanyUsers } from '@/features/users/queries/use-users'
import type { CompanyUser } from '@/features/users/api/users'
import { EmptyState } from '@/shared/components/empty-state'
import { ErrorState } from '@/shared/components/error-state'
import { LoadingState } from '@/shared/components/loading-state'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Pencil, Trash2 } from 'lucide-react'

const dateFormatter = new Intl.DateTimeFormat('he-IL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

const weekdayFormatter = new Intl.DateTimeFormat('he-IL', {
  weekday: 'long',
  timeZone: 'UTC',
})

const timeFormatter = new Intl.DateTimeFormat('he-IL', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
})

const isApiError = (value: unknown): value is ApiError => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    typeof (value as { status?: unknown }).status === 'number'
  )
}

const formatTime = (value: string) => timeFormatter.format(new Date(value))
const formatUserName = (user: Pick<CompanyUser, 'firstName' | 'lastName'>) => `${user.firstName} ${user.lastName}`.trim()
const getMutationErrorMessage = (error: unknown, fallbackMessage: string) =>
  isApiError(error) ? error.message : fallbackMessage

const formatSelectedDay = (dateKey: string) => {
  const date = new Date(`${dateKey}T00:00:00.000Z`)
  return `${weekdayFormatter.format(date)} ${dateFormatter.format(date)}`
}

const toDateKey = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return undefined
  }

  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const clampDateKeyToRange = (dateKey: string, startDateKey: string, endDateKey: string) => {
  if (dateKey < startDateKey) {
    return startDateKey
  }

  if (dateKey > endDateKey) {
    return endDateKey
  }

  return dateKey
}

const addUtcDays = (dateKey: string, amount: number) => {
  const date = new Date(`${dateKey}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + amount)
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const toDateTimeInputValue = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

interface TaskInstanceEditorState {
  mode: 'create' | 'edit'
  taskInstanceId?: string
  activityTaskId: string
  title: string
  startTime: string
  endTime: string
}

const createDefaultTaskInstanceState = (
  selectedDate: string,
  activityTaskId: string,
  title = '',
): TaskInstanceEditorState => ({
  mode: 'create',
  activityTaskId,
  title,
  startTime: `${selectedDate}T08:00`,
  endTime: `${selectedDate}T16:00`,
})

const formatEvaluationReason = (reason: SchedulingDayCandidateEvaluationReason) => {
  if (reason.code === 'MISSING_REQUIRED_ROLE' || reason.code === 'MISSING_OPTIONAL_ROLE') {
    if (reason.roleName) {
      return `החייל אינו ${reason.roleName}`
    }

    return 'החייל אינו מתאים לתפקיד הנדרש'
  }

  if (reason.code === 'MISSING_REQUIRED_QUALIFICATION') {
    if (reason.qualificationName) {
      return `לחייל חסרה הסמכה נדרשת: ${reason.qualificationName}`
    }

    return 'לחייל חסרה הסמכה נדרשת'
  }

  if (reason.code === 'MISSING_OPTIONAL_QUALIFICATION') {
    if (reason.qualificationName) {
      return `לחייל חסרה הסמכה: ${reason.qualificationName}`
    }

    return 'לחייל חסרה הסמכה'
  }

  return reason.message
}

const isRequirementEvaluationReason = (reason: SchedulingDayCandidateEvaluationReason) =>
  reason.code === 'MISSING_REQUIRED_ROLE' ||
  reason.code === 'MISSING_OPTIONAL_ROLE' ||
  reason.code === 'MISSING_REQUIRED_QUALIFICATION' ||
  reason.code === 'MISSING_OPTIONAL_QUALIFICATION'

const getTaskInstanceHasCriticalIssues = (taskInstance: SchedulingDayTaskInstance) =>
  taskInstance.assignments.some((assignment) => assignment.evaluation.severity === 'CRITICAL')

const getTaskInstanceHasWarningIssues = (taskInstance: SchedulingDayTaskInstance) =>
  taskInstance.assignments.some((assignment) => assignment.evaluation.severity === 'WARNING')

const getTaskInstanceHasUnfilledSlots = (taskInstance: SchedulingDayTaskInstance) => taskInstance.assignmentSlots.unfilled > 0


const getSchedulingStatusLabel = (status: SchedulingApprovalStatus) => {
  if (status === 'PENDING_APPROVAL') {
    return 'ממתין לאישור'
  }

  if (status === 'APPROVED') {
    return 'מאושר'
  }

  return 'טיוטה'
}

const getSchedulingStatusClassName = (status: SchedulingApprovalStatus) => {
  if (status === 'PENDING_APPROVAL') {
    return 'border-warning/30 bg-warning-soft text-warning'
  }

  if (status === 'APPROVED') {
    return 'border-success/30 bg-success-soft text-success'
  }

  return 'border-info/30 bg-info-soft text-info'
}

const BOARD_TOTAL_HOURS = 24
const BOARD_HOUR_HEIGHT_PX = 76
const BOARD_TIME_AXIS_WIDTH_PX = 88
const BOARD_TASK_COLUMN_WIDTH_PX = 240

interface SlotRequirementTag {
  text: string
  required: boolean
}

const createBoardStart = (selectedDate: string) => new Date(`${selectedDate}T06:00:00.000Z`)

const getBoardHourLabel = (hourIndex: number) => {
  const normalizedHour = (((hourIndex + 6) % 24) + 24) % 24
  return `${String(normalizedHour).padStart(2, '0')}:00`
}

const getBoardPlacement = (taskInstance: SchedulingDayTaskInstance, selectedDate: string) => {
  const boardStart = createBoardStart(selectedDate)
  const boardEnd = new Date(boardStart.getTime() + BOARD_TOTAL_HOURS * 60 * 60 * 1000)
  const instanceStart = new Date(taskInstance.startTime)
  const instanceEnd = new Date(taskInstance.endTime)
  const visibleStart = new Date(Math.max(instanceStart.getTime(), boardStart.getTime()))
  const visibleEnd = new Date(Math.min(instanceEnd.getTime(), boardEnd.getTime()))
  const startMinutes = Math.max(0, Math.round((visibleStart.getTime() - boardStart.getTime()) / 60000))
  const durationMinutes = Math.max(0, Math.round((visibleEnd.getTime() - visibleStart.getTime()) / 60000))

  return {
    startMinutes,
    durationMinutes,
    topPx: (startMinutes / 60) * BOARD_HOUR_HEIGHT_PX,
    heightPx: (durationMinutes / 60) * BOARD_HOUR_HEIGHT_PX,
  }
}

const getSlotRequirementTags = (taskInstance: SchedulingDayTaskInstance) => {
  const slotCount = Math.max(taskInstance.assignmentSlots.total, 0)
  const tagsBySlot = Array.from({ length: slotCount }, () => [] as SlotRequirementTag[])

  if (slotCount === 0) {
    return tagsBySlot
  }

  const roleTags = taskInstance.requirements.roles.flatMap((role) =>
    Array.from({ length: Math.max(role.quantity, 1) }, () => ({
      text: role.roleName ?? role.roleId,
      required: role.required,
    })),
  )

  roleTags.forEach((tag, index) => {
    tagsBySlot[index % slotCount]?.push(tag)
  })

  const qualificationTags = taskInstance.requirements.qualifications.flatMap((qualification) =>
    Array.from({ length: Math.max(qualification.quantity, 1) }, () => ({
      text: qualification.qualificationName ?? qualification.qualificationId,
      required: qualification.required,
    })),
  )

  qualificationTags.forEach((tag, index) => {
    tagsBySlot[index % slotCount]?.push(tag)
  })

  return tagsBySlot
}

function SchedulingAssignmentField({
  taskInstance,
  slotTags,
  slotIndex,
  activityId,
  selectedDate,
  companyUsers,
  isUsersPending,
  isUsersError,
  onRetryUsers,
  availableUsers,
  isAvailableUsersPending,
  isAvailableUsersError,
  onRetryAvailableUsers,
  onRefreshDay,
}: {
  taskInstance: SchedulingDayTaskInstance
  slotTags: SlotRequirementTag[]
  slotIndex: number
  activityId: string
  selectedDate: string
  companyUsers: CompanyUser[]
  isUsersPending: boolean
  isUsersError: boolean
  onRetryUsers: () => void
  availableUsers: Array<Pick<CompanyUser, 'id' | 'firstName' | 'lastName' | 'email' | 'phone' | 'personalNumber' | 'isActive'>>
  isAvailableUsersPending: boolean
  isAvailableUsersError: boolean
  onRetryAvailableUsers: () => void
  onRefreshDay: () => Promise<unknown>
}) {
  const assignment = taskInstance.assignments[slotIndex]
  const assignedUserName = assignment ? formatUserName(assignment.user) : ''
  const [searchText, setSearchText] = useState(assignedUserName)
  const [isFieldOpen, setIsFieldOpen] = useState(false)
  const [assignmentError, setAssignmentError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const schedulingScope = { activityId, date: selectedDate }
  const createAssignmentMutation = useCreateTaskInstanceAssignment(taskInstance.id, schedulingScope)
  const deleteAssignmentMutation = useDeleteAssignment(schedulingScope)
  const replaceDeleteAssignmentMutation = useDeleteAssignment()

  useEffect(() => {
    setSearchText(assignedUserName)
    setAssignmentError(null)
  }, [assignedUserName])

  const isSearching = searchText.trim().length > 0 && searchText.trim() !== assignedUserName

  const matchingUsers = useMemo(() => {
    const normalizedSearch = searchText.trim().toLocaleLowerCase()

    if (normalizedSearch.length === 0) {
      return availableUsers.filter((user) => user.id !== assignment?.userId).slice(0, 6)
    }

    return companyUsers
      .filter((user) => user.id !== assignment?.userId)
      .filter((user) => {
        const candidateText = [user.firstName, user.lastName, user.email, user.phone, user.personalNumber]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase()

        return candidateText.includes(normalizedSearch)
      })
      .slice(0, 6)
  }, [assignment?.userId, availableUsers, companyUsers, searchText])

  const isBusy =
    isSubmitting ||
    createAssignmentMutation.isPending ||
    deleteAssignmentMutation.isPending ||
    replaceDeleteAssignmentMutation.isPending

  const assignUser = async (candidateUserId: string) => {
    if (isBusy) {
      return
    }

    setAssignmentError(null)
    setIsSubmitting(true)

    let removedExistingAssignment = false

    try {
      if (assignment) {
        await replaceDeleteAssignmentMutation.mutateAsync(assignment.id)
        removedExistingAssignment = true
      }

      await createAssignmentMutation.mutateAsync({ userId: candidateUserId })
      setSearchText('')
    } catch (error) {
      if (removedExistingAssignment) {
        await onRefreshDay()
      }

      setAssignmentError(getMutationErrorMessage(error, 'שמירת השיבוץ נכשלה. אפשר לנסות שוב.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const removeAssignment = async () => {
    if (!assignment || isBusy) {
      return false
    }

    setAssignmentError(null)
    setIsSubmitting(true)

    try {
      await deleteAssignmentMutation.mutateAsync(assignment.id)
      setSearchText('')
      return true
    } catch (error) {
      setAssignmentError(getMutationErrorMessage(error, 'מחיקת השיבוץ נכשלה. אפשר לנסות שוב.'))
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSearchChange = async (nextValue: string) => {
    if (isBusy) {
      return
    }

    setAssignmentError(null)
    setSearchText(nextValue)
    setIsFieldOpen(true)

    if (assignment && nextValue.trim().length === 0) {
      const removed = await removeAssignment()
      if (!removed) {
        setSearchText(assignedUserName)
      }
    }
  }

  const slotRequirementText = Array.from(new Set(slotTags.map((tag) => tag.text).filter((text) => text.trim().length > 0))).join(' · ')
  const shouldShowMissingManpower = !assignment && taskInstance.assignmentSlots.unfilled > 0
  const requirementEvaluationReasons = assignment?.evaluation.reasons.filter(isRequirementEvaluationReason) ?? []

  return (
    <div data-testid={`planning-slot-${taskInstance.id}-${slotIndex}`} className="space-y-1 text-right">
      <div className="space-y-1">
        {slotRequirementText.length > 0 ? <div className="text-xs text-muted-foreground">{slotRequirementText}</div> : null}
        <div className="min-w-0">
          <Label htmlFor={`planning-assignment-search-${taskInstance.id}-${slotIndex}`} className="sr-only">
            שיבוץ חייל
          </Label>
          <Input
            id={`planning-assignment-search-${taskInstance.id}-${slotIndex}`}
            value={searchText}
            onChange={(event) => {
              void handleSearchChange(event.target.value)
            }}
            onFocus={() => {
              setIsFieldOpen(true)
            }}
            onBlur={() => {
              setIsFieldOpen(false)
            }}
            placeholder={assignment ? 'החלפת חייל' : 'שיבוץ חייל'}
            disabled={isBusy || isUsersPending || isAvailableUsersPending}
            aria-busy={isBusy}
            className={shouldShowMissingManpower ? 'border-danger/50 focus-visible:ring-danger/50' : undefined}
          />

          {assignment && isSearching ? <p className="mt-1 text-[11px] text-muted">כעת: {assignedUserName}</p> : null}
          {isUsersPending || isAvailableUsersPending ? <p className="mt-1 text-[11px] text-muted">טוען חיילים…</p> : null}

          {isUsersError || isAvailableUsersError ? (
            <div className="mt-1 rounded-md border border-danger/30 bg-danger-soft/20 px-2 py-1 text-[11px] text-danger">
              <p>טעינת החיילים נכשלה.</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-1 h-7 px-2 text-[11px]"
                onClick={() => {
                  onRetryUsers()
                  onRetryAvailableUsers()
                }}
              >
                ניסיון חוזר
              </Button>
            </div>
          ) : null}

          {!isUsersPending && !isUsersError && !isAvailableUsersPending && !isAvailableUsersError && isSearching && matchingUsers.length === 0 ? (
            <p className="mt-1 text-[11px] text-muted">לא נמצאו חיילים התואמים את החיפוש.</p>
          ) : null}

          {isFieldOpen && matchingUsers.length > 0 ? (
            <div className="mt-1 space-y-1 rounded-md border border-border bg-surface p-1">
              {matchingUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-md px-2 py-1 text-right text-xs text-foreground hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isBusy}
                  onMouseDown={(event) => {
                    event.preventDefault()
                  }}
                  onClick={() => {
                    void assignUser(user.id)
                  }}
                >
                  <span className="min-w-0">
                    <span className="block font-medium">{formatUserName(user)}</span>
                    <span className="block text-[11px] text-muted">{user.personalNumber}</span>
                  </span>
                  <span className="text-[11px] text-muted">בחר</span>
                </button>
              ))}
            </div>
          ) : null}

          {requirementEvaluationReasons.length > 0 ? (
            <div data-testid={`planning-assignment-evaluation-${assignment?.id}`} className="mt-1 space-y-0.5 text-[11px] leading-4 text-danger">
              {requirementEvaluationReasons.map((reason, index) => (
                <p key={`${assignment?.id}-reason-${reason.code}-${index}`}>{formatEvaluationReason(reason)}</p>
              ))}
            </div>
          ) : null}

          {assignmentError ? (
            <div className="mt-1 rounded-md border border-danger/30 bg-danger-soft/20 px-2 py-1 text-[11px] text-danger" role="alert">
              {assignmentError}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function SchedulingTaskInstanceBlock({
  taskInstance,
  activityId,
  selectedDate,
  companyUsers,
  isUsersPending,
  isUsersError,
  onRetryUsers,
  onRefreshDay,
  onDeleteTaskInstance,
  onEditTaskInstance,
}: {
  taskInstance: SchedulingDayTaskInstance
  activityId: string
  selectedDate: string
  companyUsers: CompanyUser[]
  isUsersPending: boolean
  isUsersError: boolean
  onRetryUsers: () => void
  onRefreshDay: () => Promise<unknown>
  onDeleteTaskInstance: (taskInstance: SchedulingDayTaskInstance) => Promise<void>
  onEditTaskInstance: (taskInstance: SchedulingDayTaskInstance) => void
}) {
  const placement = getBoardPlacement(taskInstance, selectedDate)
  const slotCount = Math.max(taskInstance.assignmentSlots.total, 0)
  const slots = Array.from({ length: slotCount }, (_, index) => index)
  const slotTags = getSlotRequirementTags(taskInstance)
  const availableUsersQuery = useAvailableUsers(taskInstance.id)
  const isCorrectlyStaffed =
    taskInstance.assignmentSlots.unfilled === 0 &&
    taskInstance.validation.requiredErrors.length === 0 &&
    taskInstance.assignments.every((assignment) => assignment.evaluation.severity === 'NORMAL')
  const displayTitle = taskInstance.title.trim().length > 0 ? taskInstance.title : taskInstance.activityTask.name

  return (
    <div
      data-testid={`planning-instance-block-${taskInstance.id}`}
      data-start-minute={placement.startMinutes}
      data-duration-minutes={placement.durationMinutes}
      data-staffing-state={isCorrectlyStaffed ? 'ready' : 'attention'}
      className={
        isCorrectlyStaffed
          ? 'absolute inset-x-2 rounded-xl border border-success/40 bg-success-soft/20 shadow-panel'
          : 'absolute inset-x-2 rounded-xl border border-border/80 bg-surface/95 shadow-panel'
      }
      style={{ top: placement.topPx, height: placement.heightPx }}
      aria-label={`${taskInstance.activityTask.name} ${formatTime(taskInstance.startTime)} עד ${formatTime(taskInstance.endTime)}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/70 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{displayTitle || 'ללא שם'}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="עריכת מופע משימה"
            title="עריכת מופע משימה"
            onClick={() => onEditTaskInstance(taskInstance)}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-danger hover:text-danger"
            aria-label="מחיקת מופע משימה"
            title="מחיקת מופע משימה"
            onClick={() => {
              void onDeleteTaskInstance(taskInstance)
            }}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="space-y-2 px-3 py-3">
        {slots.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-background/70 px-3 py-3 text-center text-xs text-muted">
            אין תקנים מוגדרים למופע זה.
          </div>
        ) : (
          <div className="space-y-2">
            {slots.map((slotIndex) => (
              <SchedulingAssignmentField
                key={`${taskInstance.id}-slot-${slotIndex}`}
                taskInstance={taskInstance}
                slotTags={slotTags[slotIndex] ?? []}
                slotIndex={slotIndex}
                activityId={activityId}
                selectedDate={selectedDate}
                companyUsers={companyUsers}
                isUsersPending={isUsersPending}
                isUsersError={isUsersError}
                onRetryUsers={onRetryUsers}
                availableUsers={availableUsersQuery.data ?? []}
                isAvailableUsersPending={availableUsersQuery.isPending}
                isAvailableUsersError={availableUsersQuery.isError}
                onRetryAvailableUsers={() => {
                  void availableUsersQuery.refetch()
                }}
                onRefreshDay={onRefreshDay}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function ActivityPlanningPage() {
  const navigate = useNavigate()
  const { activityId } = useParams<{ activityId: string }>()
  const { hasPermission } = usePermissions()
  const activityQuery = useActivityById(activityId)
  const activityTasksQuery = useActivityTasks(activityId)
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined)
  const [taskInstanceEditor, setTaskInstanceEditor] = useState<TaskInstanceEditorState | null>(null)
  const [taskInstanceEditorError, setTaskInstanceEditorError] = useState<string | null>(null)

  const createTaskInstanceMutation = useCreateActivityTaskInstance(taskInstanceEditor?.activityTaskId)
  const updateTaskInstanceMutation = useUpdateActivityTaskInstance()
  const deleteTaskInstanceMutation = useDeleteActivityTaskInstance()
  const companyUsersQuery = useCompanyUsers(activityQuery.data?.companyId, {
    page: 1,
    pageSize: 100,
    sortBy: 'firstName',
    sortOrder: 'asc',
  })

  useEffect(() => {
    const activity = activityQuery.data
    if (!activity) {
      return
    }

    const startDateKey = toDateKey(activity.startDate)
    const endDateKey = toDateKey(activity.endDate)
    if (!startDateKey || !endDateKey) {
      return
    }

    const nextSelectedDate =
      typeof selectedDate === 'string' && selectedDate.length > 0
        ? clampDateKeyToRange(selectedDate, startDateKey, endDateKey)
        : startDateKey

    if (nextSelectedDate !== selectedDate) {
      setSelectedDate(nextSelectedDate)
    }
  }, [activityQuery.data, selectedDate])

  const schedulingDayQuery = useActivitySchedulingDay(activityId, selectedDate)
  const openSchedulingDayMutation = useOpenActivitySchedulingDay(activityId, selectedDate)
  const submitSchedulingDayForApprovalMutation = useSubmitActivitySchedulingDayForApproval(activityId, selectedDate)
  const approveSchedulingDayMutation = useApproveActivitySchedulingDay(activityId, selectedDate)
  const returnSchedulingDayToDraftMutation = useReturnActivitySchedulingDayToDraft(activityId, selectedDate)

  const activityStartDateKey = activityQuery.data ? toDateKey(activityQuery.data.startDate) : undefined
  const activityEndDateKey = activityQuery.data ? toDateKey(activityQuery.data.endDate) : undefined
  const companyUsers = companyUsersQuery.data?.items ?? []
  const schedulingDayTaskInstances = schedulingDayQuery.data?.taskInstances ?? []
  const schedulingStatus = schedulingDayQuery.data?.schedulingStatus ?? 'DRAFT'
  const canSubmitSchedulingDay = hasPermission('MANAGE_COMPANIES') && schedulingStatus === 'DRAFT'
  const canApproveSchedulingDay = hasPermission('APPROVE_SCHEDULING') && schedulingStatus === 'PENDING_APPROVAL'
  const isSchedulingStatusTransitionPending =
    submitSchedulingDayForApprovalMutation.isPending ||
    approveSchedulingDayMutation.isPending ||
    returnSchedulingDayToDraftMutation.isPending

  const boardSummary = useMemo(() => {
    return schedulingDayTaskInstances.reduce(
      (summary, taskInstance) => {
        summary.totalSlots += taskInstance.assignmentSlots.total
        summary.filledSlots += taskInstance.assignmentSlots.filled
        summary.unfilledSlots += taskInstance.assignmentSlots.unfilled
        summary.criticalAssignments += taskInstance.assignments.filter(
          (assignment) => assignment.evaluation.severity === 'CRITICAL',
        ).length
        summary.warningAssignments += taskInstance.assignments.filter(
          (assignment) => assignment.evaluation.severity === 'WARNING',
        ).length
        summary.unfilledTaskInstances += getTaskInstanceHasUnfilledSlots(taskInstance) ? 1 : 0
        summary.criticalTaskInstances += getTaskInstanceHasCriticalIssues(taskInstance) ? 1 : 0
        summary.warningTaskInstances += getTaskInstanceHasWarningIssues(taskInstance) ? 1 : 0
        summary.needsAttentionTaskInstances +=
          getTaskInstanceHasUnfilledSlots(taskInstance) || getTaskInstanceHasCriticalIssues(taskInstance) ? 1 : 0
        return summary
      },
      {
        totalSlots: 0,
        filledSlots: 0,
        unfilledSlots: 0,
        criticalAssignments: 0,
        warningAssignments: 0,
        unfilledTaskInstances: 0,
        criticalTaskInstances: 0,
        warningTaskInstances: 0,
        needsAttentionTaskInstances: 0,
      },
    )
  }, [schedulingDayTaskInstances])

  const boardColumns = useMemo(() => {
    const columns = new Map<string, {
      id: string
      name: string
      description: string | null | undefined
      instances: SchedulingDayTaskInstance[]
    }>()

    for (const activityTask of activityTasksQuery.data ?? []) {
      columns.set(activityTask.id, {
        id: activityTask.id,
        name: activityTask.name,
        description: activityTask.description,
        instances: [],
      })
    }

    for (const taskInstance of schedulingDayTaskInstances) {
      const existingColumn = columns.get(taskInstance.activityTask.id)

      if (existingColumn) {
        existingColumn.instances.push(taskInstance)
        continue
      }

      columns.set(taskInstance.activityTask.id, {
        id: taskInstance.activityTask.id,
        name: taskInstance.activityTask.name,
        description: taskInstance.activityTask.description,
        instances: [taskInstance],
      })
    }

    return Array.from(columns.values())
      .map((column) => ({
        ...column,
        instances: [...column.instances].sort((left, right) => left.startTime.localeCompare(right.startTime)),
      }))
  }, [activityTasksQuery.data, schedulingDayTaskInstances])

  const boardHeightPx = BOARD_TOTAL_HOURS * BOARD_HOUR_HEIGHT_PX
  const boardHourMarkers = Array.from({ length: BOARD_TOTAL_HOURS + 1 }, (_, index) => index)

  const canGoToPreviousDay =
    typeof selectedDate === 'string' &&
    selectedDate.length > 0 &&
    typeof activityStartDateKey === 'string' &&
    selectedDate > activityStartDateKey

  const canGoToNextDay =
    typeof selectedDate === 'string' &&
    selectedDate.length > 0 &&
    typeof activityEndDateKey === 'string' &&
    selectedDate < activityEndDateKey

  const goToPreviousDay = () => {
    if (!canGoToPreviousDay || !selectedDate) {
      return
    }

    setSelectedDate(addUtcDays(selectedDate, -1))
  }

  const goToNextDay = () => {
    if (!canGoToNextDay || !selectedDate) {
      return
    }

    setSelectedDate(addUtcDays(selectedDate, 1))
  }

  const isTaskInstanceFormBusy =
    createTaskInstanceMutation.isPending ||
    updateTaskInstanceMutation.isPending ||
    deleteTaskInstanceMutation.isPending

  const openCreateTaskInstanceDialog = (activityTaskId: string, taskName: string) => {
    if (!selectedDate) {
      return
    }

    setTaskInstanceEditorError(null)
    setTaskInstanceEditor(createDefaultTaskInstanceState(selectedDate, activityTaskId, taskName))
  }

  const openEditTaskInstanceDialog = (taskInstance: SchedulingDayTaskInstance) => {
    setTaskInstanceEditorError(null)
    setTaskInstanceEditor({
      mode: 'edit',
      taskInstanceId: taskInstance.id,
      activityTaskId: taskInstance.activityTask.id,
      title: taskInstance.title,
      startTime: toDateTimeInputValue(taskInstance.startTime),
      endTime: toDateTimeInputValue(taskInstance.endTime),
    })
  }

  const closeTaskInstanceDialog = () => {
    if (isTaskInstanceFormBusy) {
      return
    }

    setTaskInstanceEditorError(null)
    setTaskInstanceEditor(null)
  }

  const onTaskInstanceEditorChange = (field: 'activityTaskId' | 'title' | 'startTime' | 'endTime', value: string) => {
    setTaskInstanceEditor((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        [field]: value,
      }
    })
  }

  const submitTaskInstanceEditor = async () => {
    if (!taskInstanceEditor) {
      return
    }

    setTaskInstanceEditorError(null)

    const title = taskInstanceEditor.title.trim()
    if (title.length === 0) {
      setTaskInstanceEditorError('יש להזין כותרת למופע המשימה.')
      return
    }

    const start = new Date(taskInstanceEditor.startTime)
    const end = new Date(taskInstanceEditor.endTime)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setTaskInstanceEditorError('יש להזין זמני התחלה וסיום תקינים.')
      return
    }

    if (start >= end) {
      setTaskInstanceEditorError('שעת הסיום חייבת להיות אחרי שעת ההתחלה.')
      return
    }

    const payload = {
      title,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    }

    try {
      if (taskInstanceEditor.mode === 'create') {
        await createTaskInstanceMutation.mutateAsync(payload)
      } else {
        if (!taskInstanceEditor.taskInstanceId) {
          setTaskInstanceEditorError('לא נמצא מזהה מופע משימה לעדכון.')
          return
        }

        await updateTaskInstanceMutation.mutateAsync({
          taskInstanceId: taskInstanceEditor.taskInstanceId,
          body: payload,
        })
      }

      await schedulingDayQuery.refetch()
      setTaskInstanceEditor(null)
    } catch {
      setTaskInstanceEditorError('שמירת מופע המשימה נכשלה. אפשר לנסות שוב.')
    }
  }

  const deleteTaskInstance = async (taskInstance: SchedulingDayTaskInstance) => {
    const confirmed = window.confirm('האם למחוק את מופע המשימה?')
    if (!confirmed) {
      return
    }

    try {
      await deleteTaskInstanceMutation.mutateAsync(taskInstance.id)
      await schedulingDayQuery.refetch()
    } catch {
      setTaskInstanceEditorError('מחיקת מופע המשימה נכשלה. אפשר לנסות שוב.')
    }
  }

  const openSelectedSchedulingDay = async () => {
    if (openSchedulingDayMutation.isPending || schedulingDayQuery.data?.isDayOpened) {
      return
    }

    const confirmed = window.confirm('האם לפתוח את יום השיבוץ הנבחר?')
    if (!confirmed) {
      return
    }

    setTaskInstanceEditorError(null)

    try {
      await openSchedulingDayMutation.mutateAsync()
    } catch (error) {
      setTaskInstanceEditorError(getMutationErrorMessage(error, 'פתיחת יום השיבוץ נכשלה. אפשר לנסות שוב.'))
    }
  }

  const submitSchedulingDayForApproval = async () => {
    if (!canSubmitSchedulingDay || isSchedulingStatusTransitionPending) {
      return
    }

    const confirmed = window.confirm('האם לשלוח את יום השיבוץ לאישור?')
    if (!confirmed) {
      return
    }

    setTaskInstanceEditorError(null)

    try {
      await submitSchedulingDayForApprovalMutation.mutateAsync()
    } catch (error) {
      setTaskInstanceEditorError(getMutationErrorMessage(error, 'שליחת יום השיבוץ לאישור נכשלה. אפשר לנסות שוב.'))
    }
  }

  const approveSchedulingDay = async () => {
    if (!canApproveSchedulingDay || isSchedulingStatusTransitionPending) {
      return
    }

    setTaskInstanceEditorError(null)

    try {
      await approveSchedulingDayMutation.mutateAsync()
    } catch (error) {
      setTaskInstanceEditorError(getMutationErrorMessage(error, 'אישור יום השיבוץ נכשל. אפשר לנסות שוב.'))
    }
  }

  const returnSchedulingDayToDraft = async () => {
    if (!canApproveSchedulingDay || isSchedulingStatusTransitionPending) {
      return
    }

    const confirmed = window.confirm('האם להחזיר את יום השיבוץ לתיקון?')
    if (!confirmed) {
      return
    }

    setTaskInstanceEditorError(null)

    try {
      await returnSchedulingDayToDraftMutation.mutateAsync()
    } catch (error) {
      setTaskInstanceEditorError(getMutationErrorMessage(error, 'החזרת יום השיבוץ לתיקון נכשלה. אפשר לנסות שוב.'))
    }
  }

  if (!activityId) {
    return (
      <>
        <PageHeader title="תכנון תפעולי" description="לא התקבל מזהה פעילות תקין." />
        <ContentContainer className="pb-10">
          <ErrorState
            title="מזהה פעילות חסר"
            description="לא ניתן לטעון תכנון תפעולי בלי מזהה פעילות חוקי."
            action={
              <Button type="button" variant="secondary" onClick={() => navigate('/activities')}>
                חזרה לרשימת הפעילויות
              </Button>
            }
          />
        </ContentContainer>
      </>
    )
  }

  if (activityQuery.isPending || !selectedDate || schedulingDayQuery.isPending) {
    return (
      <>
        <PageHeader title="תכנון תפעולי" description="סקירת תכנון התפעול של הפעילות." />
        <ContentContainer className="pb-10">
          <LoadingState title="טוען תכנון תפעולי" description="נתוני הפעילות ויום השיבוץ נטענים כעת." />
        </ContentContainer>
      </>
    )
  }

  if (activityQuery.isError) {
    const error = activityQuery.error
    const isNotFound = isApiError(error) && error.status === 404

    return (
      <>
        <PageHeader title="תכנון תפעולי" description="סקירת תכנון התפעול של הפעילות." />
        <ContentContainer className="pb-10">
          <ErrorState
            title={isNotFound ? 'הפעילות לא נמצאה' : 'טעינת תכנון התפעול נכשל'}
            description={
              isNotFound
                ? 'לא נמצאה פעילות עם המזהה שנבחר. אפשר לחזור לרשימת הפעילויות.'
                : 'לא הצלחנו לטעון את תכנון התפעול של הפעילות. אפשר לנסות שוב.'
            }
            action={
              <Button type="button" variant="secondary" onClick={() => void activityQuery.refetch()}>
                ניסיון חוזר
              </Button>
            }
          />
        </ContentContainer>
      </>
    )
  }

  if (schedulingDayQuery.isError) {
    return (
      <>
        <PageHeader title="תכנון תפעולי" description="סקירת תכנון התפעול של הפעילות." />
        <ContentContainer className="pb-10">
          <ErrorState
            title="טעינת יום השיבוץ נכשלה"
            description="לא הצלחנו לטעון את נתוני יום השיבוץ. אפשר לנסות שוב."
            action={
              <Button type="button" variant="secondary" onClick={() => void schedulingDayQuery.refetch()}>
                ניסיון חוזר
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
        title={activityQuery.data?.name ?? 'תכנון תפעולי'}
        description="תצוגת שיבוץ יומית של הפעילות."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate(`/activities/${activityId}`)}>
              חזרה לפרטי הפעילות
            </Button>
          </div>
        }
      />

      <ContentContainer className="space-y-5 pb-10">
        <Card>
          <CardHeader className="px-4 py-4 sm:px-5">
            <div className="space-y-3">
              <div className="flex items-center gap-2" style={{ direction: 'ltr' }} data-testid="planning-board-primary-header">
                <Button
                  type="button"
                  variant="secondary"
                  aria-label="יום שיבוץ הבא"
                  data-testid="planning-next-day-button"
                  onClick={goToNextDay}
                  disabled={!canGoToNextDay}
                >
                  יום הבא
                </Button>
                <div className="flex-1 text-center" style={{ direction: 'rtl' }} data-testid="planning-board-date-status">
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-base font-semibold text-foreground" data-testid="planning-selected-day-title">
                      שיבוץ — {formatSelectedDay(selectedDate)}
                    </p>
                    <span data-testid="planning-scheduling-status">
                      <Badge className={getSchedulingStatusClassName(schedulingStatus)}>{getSchedulingStatusLabel(schedulingStatus)}</Badge>
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  aria-label="יום שיבוץ קודם"
                  data-testid="planning-previous-day-button"
                  onClick={goToPreviousDay}
                  disabled={!canGoToPreviousDay}
                >
                  יום קודם
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">לוח שיבוץ יומי</CardTitle>
                <div className="flex flex-wrap items-center justify-end gap-2">
                {canSubmitSchedulingDay ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void submitSchedulingDayForApproval()}
                    disabled={isSchedulingStatusTransitionPending}
                    aria-busy={isSchedulingStatusTransitionPending}
                  >
                    שלח לאישור
                  </Button>
                ) : null}
                {canApproveSchedulingDay ? (
                  <>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => void approveSchedulingDay()}
                      disabled={isSchedulingStatusTransitionPending}
                      aria-busy={isSchedulingStatusTransitionPending}
                    >
                      אשר שיבוץ
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void returnSchedulingDayToDraft()}
                      disabled={isSchedulingStatusTransitionPending}
                      aria-busy={isSchedulingStatusTransitionPending}
                    >
                      החזר לתיקון
                    </Button>
                  </>
                ) : null}
                {schedulingDayQuery.data?.isDayOpened ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      const defaultTask = activityTasksQuery.data?.[0]
                      if (!defaultTask) {
                        setTaskInstanceEditorError('לא נמצאו משימות פעילות להוספת מופע.')
                        return
                      }

                      openCreateTaskInstanceDialog(defaultTask.id, defaultTask.name)
                    }}
                    disabled={activityTasksQuery.isPending || !activityTasksQuery.data || activityTasksQuery.data.length === 0}
                  >
                    הוספת מופע משימה
                  </Button>
                ) : null}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-4 pb-5 sm:px-5">
            {schedulingDayQuery.data?.isDayOpened ? (
              <>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4" data-testid="planning-kpi-grid">
                  <div className="rounded-md border border-border/70 bg-surface/50 p-2" data-testid="planning-summary-coverage">
                    <p className="text-[10px] uppercase tracking-wide text-muted">כיסוי משבצות</p>
                    <p className="mt-0.5 text-xs font-semibold text-foreground">
                      {boardSummary.filledSlots} / {boardSummary.totalSlots} מאוישות
                    </p>
                    <p className="text-[11px] text-muted">פנויות: {boardSummary.unfilledSlots}</p>
                  </div>
                  <div className="rounded-md border border-border/70 bg-surface/50 p-2" data-testid="planning-summary-problems">
                    <p className="text-[10px] uppercase tracking-wide text-muted">סיכום בעיות שיבוץ</p>
                    <p className="mt-0.5 text-xs font-semibold text-foreground">קריטיות: {boardSummary.criticalAssignments}</p>
                    <p className="text-[11px] text-muted">אזהרות: {boardSummary.warningAssignments}</p>
                  </div>
                  <div className="rounded-md border border-border/70 bg-surface/50 p-2" data-testid="planning-summary-task-attention">
                    <p className="text-[10px] uppercase tracking-wide text-muted">מופעים הדורשים טיפול</p>
                    <p className="mt-0.5 text-xs font-semibold text-foreground">{boardSummary.needsAttentionTaskInstances}</p>
                    <p className="text-[11px] text-muted">עם משבצות פנויות או חריגה קריטית</p>
                  </div>
                  <div className="rounded-md border border-border/70 bg-surface/50 p-2" data-testid="planning-summary-task-problems">
                    <p className="text-[10px] uppercase tracking-wide text-muted">מצב מופעי משימה</p>
                    <p className="mt-0.5 text-xs font-semibold text-foreground">פנויות: {boardSummary.unfilledTaskInstances}</p>
                    <p className="text-[11px] text-muted">קריטיות: {boardSummary.criticalTaskInstances} · אזהרות: {boardSummary.warningTaskInstances}</p>
                  </div>
                </div>

              </>
            ) : null}

            {taskInstanceEditorError ? (
              <div className="rounded-md border border-danger/30 bg-danger-soft/20 px-3 py-2 text-sm text-danger" role="alert">
                {taskInstanceEditorError}
              </div>
            ) : null}
            {!schedulingDayQuery.data?.isDayOpened ? (
              <div className="space-y-3">
                <EmptyState
                  title="היום עדיין לא נפתח"
                  description="לא קיימים מופעי משימות ליום זה. ניתן לפתוח את היום כדי להתחיל בתכנון ושיבוץ."
                />
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => void openSelectedSchedulingDay()}
                    disabled={openSchedulingDayMutation.isPending}
                    aria-busy={openSchedulingDayMutation.isPending}
                  >
                    פתח יום שיבוץ
                  </Button>
                </div>
              </div>
            ) : schedulingDayQuery.data.taskInstances.length === 0 ? (
              <EmptyState
                title="אין מופעי משימה ליום פתוח זה"
                description="היום פתוח, אבל עדיין לא הוגדרו מופעי משימה לשיבוץ."
              />
            ) : (
                <div className="rounded-xl border border-border bg-background/60" data-testid="planning-scheduling-grid">
                <div className="flex">
                  <div className="min-w-0 flex-1 overflow-x-auto">
                    <div className="w-max min-w-full">
                      <div className="flex" dir="rtl">
                        {boardColumns.map((column) => (
                          <div
                            key={`planning-column-header-${column.id}`}
                            data-testid={`planning-column-header-${column.id}`}
                            className="flex h-16 items-end justify-center border-b border-s border-border bg-surface-elevated px-2 py-3 text-center"
                            style={{ width: BOARD_TASK_COLUMN_WIDTH_PX, minWidth: BOARD_TASK_COLUMN_WIDTH_PX }}
                          >
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-foreground">{column.name}</p>
                              <p className="text-[11px] text-muted">{column.instances.length} מופעים</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex" dir="rtl">
                        {boardColumns.map((column) => (
                          <div
                            key={`planning-task-column-${column.id}`}
                            data-testid={`planning-task-column-${column.id}`}
                            className="relative border-s border-border bg-surface/35"
                            style={{
                              width: BOARD_TASK_COLUMN_WIDTH_PX,
                              minWidth: BOARD_TASK_COLUMN_WIDTH_PX,
                              height: boardHeightPx,
                            }}
                          >
                            {boardHourMarkers.map((marker) => (
                              <div
                                key={`column-${column.id}-line-${marker}`}
                                className="pointer-events-none absolute inset-x-0 border-t border-border/60"
                                style={{ top: marker * BOARD_HOUR_HEIGHT_PX }}
                              />
                            ))}

                            {column.instances.map((taskInstance) => (
                              <SchedulingTaskInstanceBlock
                                key={taskInstance.id}
                                taskInstance={taskInstance}
                                activityId={activityId}
                                selectedDate={selectedDate}
                                companyUsers={companyUsers}
                                isUsersPending={companyUsersQuery.isPending}
                                isUsersError={companyUsersQuery.isError}
                                onRetryUsers={() => {
                                  void companyUsersQuery.refetch()
                                }}
                                onRefreshDay={() => schedulingDayQuery.refetch()}
                                onEditTaskInstance={openEditTaskInstanceDialog}
                                onDeleteTaskInstance={deleteTaskInstance}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div
                    className="shrink-0 border-s border-border bg-surface"
                    data-testid="planning-time-axis"
                    style={{ width: BOARD_TIME_AXIS_WIDTH_PX }}
                  >
                    <div className="flex h-16 items-end justify-center border-b border-border bg-surface-elevated px-2 py-3">
                        <span className="text-[11px] uppercase tracking-wide text-muted" data-testid="planning-time-axis-window">
                          06:00 → 06:00 (+1)
                        </span>
                    </div>
                    <div className="relative" style={{ height: boardHeightPx }}>
                      {boardHourMarkers.map((marker) => (
                        <div
                          key={`time-axis-line-${marker}`}
                          className="pointer-events-none absolute inset-x-0 border-t border-border/70"
                          style={{ top: marker * BOARD_HOUR_HEIGHT_PX }}
                        />
                      ))}
                      {boardHourMarkers.map((marker) => (
                        <div
                          key={`time-axis-label-${marker}`}
                          className="absolute inset-x-0 -translate-y-1/2 px-2 text-center text-xs font-medium text-muted"
                          style={{ top: marker * BOARD_HOUR_HEIGHT_PX }}
                          data-testid={`planning-time-axis-label-${marker}`}
                        >
                          {getBoardHourLabel(marker)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={taskInstanceEditor !== null} onOpenChange={(open) => {
          if (!open) {
            closeTaskInstanceDialog()
          }
        }}>
          <DialogContent aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>{taskInstanceEditor?.mode === 'edit' ? 'עריכת מופע משימה' : 'מופע משימה חדש'}</DialogTitle>
              <DialogDescription>
                {taskInstanceEditor?.mode === 'edit'
                  ? 'אפשר לעדכן את המשימה המשויכת, הכותרת וטווח הזמנים.'
                  : 'בחר משימה, עדכן כותרת והגדר זמני התחלה וסיום.'}
              </DialogDescription>
            </DialogHeader>

            {taskInstanceEditor ? (
              <div className="space-y-4">
                <div className="space-y-2 text-right">
                  <Label htmlFor="planning-task-instance-task">משימה</Label>
                  <Select
                    value={taskInstanceEditor.activityTaskId}
                    onValueChange={(value) => onTaskInstanceEditorChange('activityTaskId', value)}
                    disabled={
                      isTaskInstanceFormBusy ||
                      taskInstanceEditor.mode === 'edit' ||
                      activityTasksQuery.isPending ||
                      !activityTasksQuery.data ||
                      activityTasksQuery.data.length === 0
                    }
                  >
                    <SelectTrigger id="planning-task-instance-task">
                      <SelectValue placeholder="בחירת משימה" />
                    </SelectTrigger>
                    <SelectContent>
                      {(activityTasksQuery.data ?? []).map((task) => (
                        <SelectItem key={task.id} value={task.id}>
                          {task.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 text-right">
                  <Label htmlFor="planning-task-instance-title">כותרת</Label>
                  <Input
                    id="planning-task-instance-title"
                    placeholder="ללא שם"
                    value={taskInstanceEditor.title}
                    onChange={(event) => onTaskInstanceEditorChange('title', event.target.value)}
                    disabled={isTaskInstanceFormBusy}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2 text-right">
                    <Label htmlFor="planning-task-instance-start">התחלה</Label>
                    <Input
                      id="planning-task-instance-start"
                      type="datetime-local"
                      value={taskInstanceEditor.startTime}
                      onChange={(event) => onTaskInstanceEditorChange('startTime', event.target.value)}
                      disabled={isTaskInstanceFormBusy}
                    />
                  </div>

                  <div className="space-y-2 text-right">
                    <Label htmlFor="planning-task-instance-end">סיום</Label>
                    <Input
                      id="planning-task-instance-end"
                      type="datetime-local"
                      value={taskInstanceEditor.endTime}
                      onChange={(event) => onTaskInstanceEditorChange('endTime', event.target.value)}
                      disabled={isTaskInstanceFormBusy}
                    />
                  </div>
                </div>

                {taskInstanceEditorError ? (
                  <div className="rounded-md border border-danger/30 bg-danger-soft/20 px-3 py-2 text-sm text-danger" role="alert">
                    {taskInstanceEditorError}
                  </div>
                ) : null}
              </div>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={closeTaskInstanceDialog} disabled={isTaskInstanceFormBusy}>
                ביטול
              </Button>
              <Button type="button" onClick={() => void submitTaskInstanceEditor()} disabled={isTaskInstanceFormBusy || !taskInstanceEditor}>
                {taskInstanceEditor?.mode === 'edit' ? 'שמירת שינויים' : 'יצירת מופע'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ContentContainer>
    </>
  )
}
