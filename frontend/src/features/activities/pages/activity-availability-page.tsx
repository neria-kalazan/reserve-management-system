import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { ApiError } from '@/api/client'
import { ContentContainer } from '@/app/layout/content-container'
import { PageHeader } from '@/app/layout/page-header'
import {
  useActivityAvailability,
  useActivityById,
  useBulkUpdateActivityAvailability,
  useGenerateActivityAvailability,
} from '@/features/activities/queries/use-activities'
import type {
  ActivityAvailabilityRecord,
  AvailabilityStatus,
} from '@/features/activities/types/activity'
import { ErrorState } from '@/shared/components/error-state'
import { LoadingState } from '@/shared/components/loading-state'
import { StatusBadge } from '@/shared/components/status-badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'

const dateFormatter = new Intl.DateTimeFormat('he-IL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

const formatDate = (value: string) => dateFormatter.format(new Date(value))
const toDateInputValue = (value: string) => value.slice(0, 10)
const availabilityOptions: AvailabilityStatus[] = ['MORNING', 'EVENING', 'ALL_DAY', 'UNAVAILABLE']

const isApiError = (value: unknown): value is ApiError => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    typeof (value as { status?: unknown }).status === 'number'
  )
}

function AvailabilityRow({ item }: { item: ActivityAvailabilityRecord }) {
  const userLabel = item.user ? [item.user.firstName, item.user.lastName].filter(Boolean).join(' ') || item.user.email || item.user.id : item.userId

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-surface px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{userLabel}</p>
        <p className="text-xs text-muted">{formatDate(item.date)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge value={item.status} />
        <StatusBadge value={item.availability} />
      </div>
    </div>
  )
}

export function ActivityAvailabilityPage() {
  const navigate = useNavigate()
  const { activityId } = useParams<{ activityId: string }>()
  const activityQuery = useActivityById(activityId)
  const availabilityQuery = useActivityAvailability(activityId)
  const generateMutation = useGenerateActivityAvailability(activityId)
  const bulkUpdateMutation = useBulkUpdateActivityAvailability(activityId)

  const userEntries = useMemo(() => {
    const byUser = new Map<string, { id: string; label: string }>()

    for (const item of availabilityQuery.data ?? []) {
      const label = item.user
        ? [item.user.firstName, item.user.lastName].filter(Boolean).join(' ') || item.user.email || item.user.id
        : item.userId

      const nextId = item.userId
      if (!byUser.has(nextId)) {
        byUser.set(nextId, { id: nextId, label })
      }
    }

    return Array.from(byUser.values())
  }, [availabilityQuery.data])

  const [bulkForm, setBulkForm] = useState({
    userIds: [] as string[],
    startDate: '',
    endDate: '',
    availability: 'ALL_DAY' as AvailabilityStatus,
  })
  const [bulkError, setBulkError] = useState<string | undefined>(undefined)
  const [bulkSuccess, setBulkSuccess] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!activityQuery.data) {
      return
    }

    const startDate = toDateInputValue(activityQuery.data.startDate)
    const endDate = toDateInputValue(activityQuery.data.endDate)
    const defaultUserIds = userEntries.map((user) => user.id)

    setBulkForm((current) => ({
      userIds: current.userIds.length > 0 ? current.userIds : defaultUserIds,
      startDate: current.startDate || startDate,
      endDate: current.endDate || endDate,
      availability: current.availability || 'ALL_DAY',
    }))
  }, [activityQuery.data, userEntries])

  const isNotFound = useMemo(() => {
    if (!activityQuery.isError || !isApiError(activityQuery.error)) {
      return false
    }

    return activityQuery.error.status === 404
  }, [activityQuery.error, activityQuery.isError])

  const applyUserToggle = (userId: string) => {
    setBulkForm((current) => ({
      ...current,
      userIds: current.userIds.includes(userId)
        ? current.userIds.filter((item) => item !== userId)
        : [...current.userIds, userId],
    }))
    setBulkError(undefined)
    setBulkSuccess(undefined)
  }

  const onBulkSave = async () => {
    if (bulkForm.userIds.length === 0) {
      setBulkError('יש לבחור לפחות משתמש אחד לעדכון.')
      return
    }

    if (!bulkForm.startDate || !bulkForm.endDate || bulkForm.endDate < bulkForm.startDate) {
      setBulkError('יש לבחור טווח תאריכים תקין.')
      return
    }

    try {
      await bulkUpdateMutation.mutateAsync({
        userIds: bulkForm.userIds,
        startDate: bulkForm.startDate,
        endDate: bulkForm.endDate,
        availability: bulkForm.availability,
      })
      setBulkError(undefined)
      setBulkSuccess('הזמינות עודכנה בהצלחה.')
    } catch (error) {
      const message = isApiError(error) ? error.message : 'לא הצלחנו לשמור את השינויים.'
      setBulkError(message)
      setBulkSuccess(undefined)
    }
  }

  if (!activityId) {
    return (
      <>
        <PageHeader title="זמינות פעילות" description="לא התקבל מזהה פעילות חוקי." />
        <ContentContainer className="pb-10">
          <ErrorState
            title="מזהה פעילות חסר"
            description="לא ניתן לטעון זמינות בלי מזהה תקין."
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
        title={activityQuery.data?.name ?? 'זמינות פעילות'}
        description="מעקב אחר זמינות המשתתפים בפעילות לפי תאריכים."
        actions={
          <Button type="button" variant="secondary" onClick={() => navigate(`/activities/${activityId}`)}>
            חזרה לפרטי פעילות
          </Button>
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
            <Card>
              <CardHeader className="px-4 py-4 sm:px-5">
                <CardTitle className="text-base">פעולות זמינות</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
                <div className="rounded-md border border-border bg-surface-elevated p-3 text-sm text-foreground">
                  <p className="font-medium">יצירת רשומות זמינות</p>
                  <p className="mt-1 text-muted">
                    הפעלת פעולה זו יוצרת זמינות אוטומטית עבור כל המשתמשים הפעילים של הפלוגה לאורך תאריכי הפעילות.
                    היא לא מוחקת נתונים קיימים.
                  </p>
                </div>
                <div className="flex justify-start">
                  <Button
                    type="button"
                    variant="secondary"
                    loading={generateMutation.isPending}
                    disabled={generateMutation.isPending || bulkUpdateMutation.isPending}
                    onClick={() => void generateMutation.mutateAsync()}
                  >
                    יצירת זמינות
                  </Button>
                </div>
                {generateMutation.isError ? (
                  <p className="text-sm text-danger">
                    {isApiError(generateMutation.error) ? generateMutation.error.message : 'לא הצלחנו ליצור זמינות.'}
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="px-4 py-4 sm:px-5">
                <CardTitle className="text-base">עדכון זמינות קבוצתי</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="bulk-start-date">תאריך התחלה</Label>
                    <Input
                      id="bulk-start-date"
                      type="date"
                      value={bulkForm.startDate}
                      onChange={(event) => {
                        setBulkForm((current) => ({ ...current, startDate: event.target.value }))
                        setBulkError(undefined)
                        setBulkSuccess(undefined)
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bulk-end-date">תאריך סיום</Label>
                    <Input
                      id="bulk-end-date"
                      type="date"
                      value={bulkForm.endDate}
                      onChange={(event) => {
                        setBulkForm((current) => ({ ...current, endDate: event.target.value }))
                        setBulkError(undefined)
                        setBulkSuccess(undefined)
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>סטטוס זמינות</Label>
                  <Select
                    value={bulkForm.availability}
                    onValueChange={(value) => {
                      setBulkForm((current) => ({ ...current, availability: value as AvailabilityStatus }))
                      setBulkError(undefined)
                      setBulkSuccess(undefined)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחירת מצב" />
                    </SelectTrigger>
                    <SelectContent>
                      {availabilityOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          <StatusBadge value={option} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>משתמשים</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {userEntries.length > 0 ? (
                      userEntries.map((user) => (
                        <label key={user.id} className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground">
                          <input
                            type="checkbox"
                            checked={bulkForm.userIds.includes(user.id)}
                            onChange={() => applyUserToggle(user.id)}
                          />
                          <span>{user.label}</span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-muted">לא קיימים משתמשים עם נתוני זמינות לפעילות זו.</p>
                    )}
                  </div>
                </div>

                {bulkError ? <p className="text-sm text-danger">{bulkError}</p> : null}
                {bulkSuccess ? <p className="text-sm text-success">{bulkSuccess}</p> : null}

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    loading={bulkUpdateMutation.isPending}
                    disabled={bulkUpdateMutation.isPending || generateMutation.isPending}
                    onClick={() => void onBulkSave()}
                  >
                    שמירת זמינות
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setBulkForm((current) => ({
                        ...current,
                        userIds: userEntries.map((user) => user.id),
                        startDate: activityQuery.data ? toDateInputValue(activityQuery.data.startDate) : current.startDate,
                        endDate: activityQuery.data ? toDateInputValue(activityQuery.data.endDate) : current.endDate,
                      }))
                      setBulkError(undefined)
                      setBulkSuccess(undefined)
                    }}
                  >
                    איפוס
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="px-4 py-4 sm:px-5">
                <CardTitle className="text-base">זמינות</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
                {availabilityQuery.isPending ? (
                  <LoadingState title="טוען זמינות" description="נתוני הזמינות נטענים כעת." />
                ) : availabilityQuery.isError ? (
                  <ErrorState
                    title="טעינת זמינות נכשלה"
                    description="לא הצלחנו לטעון את זמינות המשתתפים. אפשר לנסות שוב."
                    action={
                      <Button type="button" variant="secondary" onClick={() => void availabilityQuery.refetch()}>
                        ניסיון חוזר
                      </Button>
                    }
                  />
                ) : !availabilityQuery.data || availabilityQuery.data.length === 0 ? (
                  <ErrorState
                    title="אין נתוני זמינות"
                    description="עדיין לא נוצרו פריטי זמינות לפעילות זו."
                  />
                ) : (
                  <div className="space-y-2">
                    {availabilityQuery.data.map((item) => (
                      <AvailabilityRow key={item.id} item={item} />
                    ))}
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
