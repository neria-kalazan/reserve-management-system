import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { ApiError } from '@/api/client'
import { ContentContainer } from '@/app/layout/content-container'
import { PageHeader } from '@/app/layout/page-header'
import { useActivityById, useUpdateActivity } from '@/features/activities/queries/use-activities'
import { ErrorState } from '@/shared/components/error-state'
import { LoadingState } from '@/shared/components/loading-state'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'

interface FormValues {
  name: string
  startDate: string
  endDate: string
}

interface FormErrors {
  name: string | undefined
  startDate: string | undefined
  endDate: string | undefined
  form: string | undefined
}

const emptyErrors: FormErrors = {
  name: undefined,
  startDate: undefined,
  endDate: undefined,
  form: undefined,
}

const toDateInputValue = (value: string) => value.slice(0, 10)

const isApiError = (value: unknown): value is ApiError => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    typeof (value as { status?: unknown }).status === 'number'
  )
}

const toUserFacingError = (error: unknown) => {
  if (isApiError(error)) {
    if (error.status === 400) {
      return 'הנתונים שהוזנו אינם תקינים. בדקו את השדות ונסו שוב.'
    }

    if (error.status === 401 || error.status === 403) {
      return 'אין הרשאה לערוך את התעסוקה במצב ההתחברות הנוכחי.'
    }

    if (error.status === 404) {
      return 'התעסוקה שבחרתם לא נמצאה.'
    }
  }

  return 'לא הצלחנו לשמור את השינויים כעת. אפשר לנסות שוב.'
}

const validate = (values: FormValues): FormErrors => {
  const errors: FormErrors = { ...emptyErrors }

  if (values.name.trim().length === 0) {
    errors.name = 'יש להזין שם תעסוקה.'
  }

  if (values.startDate.length === 0) {
    errors.startDate = 'יש להזין תאריך התחלה.'
  }

  if (values.endDate.length === 0) {
    errors.endDate = 'יש להזין תאריך סיום.'
  }

  if (values.startDate.length > 0 && values.endDate.length > 0 && values.endDate < values.startDate) {
    errors.endDate = 'תאריך הסיום לא יכול להיות לפני תאריך ההתחלה.'
  }

  return errors
}

export function ActivityEditPage() {
  const navigate = useNavigate()
  const { activityId } = useParams<{ activityId: string }>()

  const activityQuery = useActivityById(activityId)
  const updateActivityMutation = useUpdateActivity()

  const [values, setValues] = useState<FormValues>({ name: '', startDate: '', endDate: '' })
  const [errors, setErrors] = useState<FormErrors>(emptyErrors)
  const [initializedForId, setInitializedForId] = useState<string | undefined>(undefined)

  const isNotFound = useMemo(() => {
    if (!activityQuery.isError || !isApiError(activityQuery.error)) {
      return false
    }

    return activityQuery.error.status === 404
  }, [activityQuery.error, activityQuery.isError])

  useEffect(() => {
    if (!activityQuery.data) {
      return
    }

    if (initializedForId === activityQuery.data.id) {
      return
    }

    setValues({
      name: activityQuery.data.name,
      startDate: toDateInputValue(activityQuery.data.startDate),
      endDate: toDateInputValue(activityQuery.data.endDate),
    })
    setInitializedForId(activityQuery.data.id)
    setErrors(emptyErrors)
  }, [activityQuery.data, initializedForId])

  const updateField = <K extends keyof FormValues>(field: K, value: FormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }))
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!activityId) {
      return
    }

    const nextErrors = validate(values)
    const hasValidationErrors = Boolean(nextErrors.name || nextErrors.startDate || nextErrors.endDate)

    if (hasValidationErrors) {
      setErrors(nextErrors)
      return
    }

    try {
      await updateActivityMutation.mutateAsync({
        activityId,
        body: {
          name: values.name.trim(),
          startDate: values.startDate,
          endDate: values.endDate,
        },
      })

      navigate(`/activities/${activityId}`)
    } catch (error) {
      setErrors((current) => ({ ...current, form: toUserFacingError(error) }))
    }
  }

  if (!activityId) {
    return (
      <>
        <PageHeader title="עריכת תעסוקה" description="לא התקבל מזהה תעסוקה חוקי." />
        <ContentContainer className="pb-10">
          <ErrorState
            title="מזהה תעסוקה חסר"
            description="לא ניתן לערוך תעסוקה בלי מזהה תקין."
            action={
              <Button type="button" variant="secondary" onClick={() => navigate('/activities')}>
                חזרה לתעסוקות
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
        title="עריכת תעסוקה"
        description="עדכון שם ותאריכי תעסוקה קיימת."
        actions={
          <Button type="button" variant="secondary" onClick={() => navigate(`/activities/${activityId}`)}>
            ביטול וחזרה
          </Button>
        }
      />

      <ContentContainer className="pb-10">
        {activityQuery.isPending ? (
          <LoadingState title="טוען נתוני תעסוקה" description="פרטי התעסוקה נטענים כעת לעריכה." />
        ) : activityQuery.isError ? (
          <ErrorState
            title={isNotFound ? 'התעסוקה לא נמצאה' : 'טעינת התעסוקה נכשלה'}
            description={
              isNotFound
                ? 'לא ניתן לערוך תעסוקה שלא נמצאה. אפשר לחזור לרשימת התעסוקות.'
                : 'לא הצלחנו לטעון את פרטי התעסוקה לעריכה. אפשר לנסות שוב.'
            }
            action={
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => void activityQuery.refetch()}>
                  ניסיון חוזר
                </Button>
                <Button type="button" variant="ghost" onClick={() => navigate('/activities')}>
                  חזרה לתעסוקות
                </Button>
              </div>
            }
          />
        ) : (
          <Card>
            <CardHeader className="px-4 py-4 sm:px-5">
              <CardTitle className="text-base">פרטי תעסוקה לעריכה</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 px-4 pb-5 sm:px-5">
              {errors.form ? (
                <ErrorState
                  title="שמירת השינויים נכשלה"
                  description={errors.form}
                />
              ) : null}

              <form className="space-y-4" onSubmit={onSubmit} noValidate>
                <div className="space-y-2">
                  <Label htmlFor="edit-activity-name">שם התעסוקה</Label>
                  <Input
                    id="edit-activity-name"
                    name="name"
                    value={values.name}
                    onChange={(event) => updateField('name', event.target.value)}
                    aria-invalid={errors.name ? 'true' : 'false'}
                  />
                  {errors.name ? <p className="text-sm text-danger">{errors.name}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-activity-start-date">תאריך התחלה</Label>
                  <Input
                    id="edit-activity-start-date"
                    name="startDate"
                    type="date"
                    value={values.startDate}
                    onChange={(event) => updateField('startDate', event.target.value)}
                    aria-invalid={errors.startDate ? 'true' : 'false'}
                  />
                  {errors.startDate ? <p className="text-sm text-danger">{errors.startDate}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-activity-end-date">תאריך סיום</Label>
                  <Input
                    id="edit-activity-end-date"
                    name="endDate"
                    type="date"
                    value={values.endDate}
                    onChange={(event) => updateField('endDate', event.target.value)}
                    aria-invalid={errors.endDate ? 'true' : 'false'}
                  />
                  {errors.endDate ? <p className="text-sm text-danger">{errors.endDate}</p> : null}
                </div>

                <div className="flex flex-wrap justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => navigate(`/activities/${activityId}`)}
                  >
                    ביטול
                  </Button>
                  <Button
                    type="submit"
                    loading={updateActivityMutation.isPending}
                    disabled={updateActivityMutation.isPending}
                  >
                    שמירת שינויים
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </ContentContainer>
    </>
  )
}
