import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import type { ApiError } from '@/api/client'
import { ContentContainer } from '@/app/layout/content-container'
import { PageHeader } from '@/app/layout/page-header'
import { useCreateActivity } from '@/features/activities/queries/use-activities'
import type { ActivityType } from '@/features/activities/types/activity'
import { ErrorState } from '@/shared/components/error-state'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'

const ACTIVITY_TYPE_OPTIONS: Array<{ value: ActivityType; label: string }> = [
  { value: 'TRAINING', label: 'אימון' },
  { value: 'EMPLOYMENT', label: 'תעסוקה' },
  { value: 'TRAINING_COURSE', label: 'השתלמות' },
]

interface FormValues {
  name: string
  type: ActivityType | ''
  startDate: string
  endDate: string
}

interface FormErrors {
  name: string | undefined
  type: string | undefined
  startDate: string | undefined
  endDate: string | undefined
  form: string | undefined
}

const initialValues: FormValues = {
  name: '',
  type: '',
  startDate: '',
  endDate: '',
}

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
      return 'אין הרשאה ליצור תעסוקה במצב ההתחברות הנוכחי.'
    }
  }

  return 'לא הצלחנו ליצור את התעסוקה כעת. אפשר לנסות שוב.'
}

const validate = (values: FormValues): FormErrors => {
  const errors: FormErrors = {
    name: undefined,
    type: undefined,
    startDate: undefined,
    endDate: undefined,
    form: undefined,
  }

  if (values.name.trim().length === 0) {
    errors.name = 'יש להזין שם תעסוקה.'
  }

  if (!values.type) {
    errors.type = 'יש לבחור סוג תעסוקה.'
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

export function ActivityCreatePage() {
  const navigate = useNavigate()
  const createActivityMutation = useCreateActivity()

  const [values, setValues] = useState<FormValues>(initialValues)
  const [errors, setErrors] = useState<FormErrors>({
    name: undefined,
    type: undefined,
    startDate: undefined,
    endDate: undefined,
    form: undefined,
  })

  const updateField = <K extends keyof FormValues>(field: K, value: FormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }))
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors = validate(values)
    const hasValidationErrors = Boolean(nextErrors.name || nextErrors.type || nextErrors.startDate || nextErrors.endDate)

    if (hasValidationErrors) {
      setErrors(nextErrors)
      return
    }

    try {
      await createActivityMutation.mutateAsync({
        name: values.name.trim(),
        type: values.type as ActivityType,
        startDate: values.startDate,
        endDate: values.endDate,
      })

      navigate('/activities')
    } catch (error) {
      setErrors((current) => ({
        ...current,
        form: toUserFacingError(error),
      }))
    }
  }

  return (
    <>
      <PageHeader
        title="יצירת תעסוקה"
        description="פתיחת תעסוקה חדשה לפלוגה לפי טווח תאריכים."
        actions={
          <Button type="button" variant="secondary" onClick={() => navigate('/activities')}>
            ביטול וחזרה
          </Button>
        }
      />

      <ContentContainer className="pb-10">
        <Card>
          <CardHeader className="px-4 py-4 sm:px-5">
            <CardTitle className="text-base">פרטי תעסוקה חדשה</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 px-4 pb-5 sm:px-5">
            {errors.form ? (
              <ErrorState
                title="יצירת התעסוקה נכשלה"
                description={errors.form}
              />
            ) : null}

            <form className="space-y-4" onSubmit={onSubmit} noValidate>
              <div className="space-y-2">
                <Label htmlFor="activity-name">שם התעסוקה</Label>
                <Input
                  id="activity-name"
                  name="name"
                  placeholder="לדוגמה: תעסוקה מבצעית"
                  value={values.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  aria-invalid={errors.name ? 'true' : 'false'}
                />
                {errors.name ? <p className="text-sm text-danger">{errors.name}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="activity-type">סוג התעסוקה</Label>
                <Select
                  value={values.type || undefined}
                  onValueChange={(value) => updateField('type', value as ActivityType)}
                >
                  <SelectTrigger id="activity-type" aria-invalid={errors.type ? 'true' : 'false'}>
                    <SelectValue placeholder="בחר סוג תעסוקה" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.type ? <p className="text-sm text-danger">{errors.type}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="activity-start-date">תאריך התחלה</Label>
                <Input
                  id="activity-start-date"
                  name="startDate"
                  type="date"
                  value={values.startDate}
                  onChange={(event) => updateField('startDate', event.target.value)}
                  aria-invalid={errors.startDate ? 'true' : 'false'}
                />
                {errors.startDate ? <p className="text-sm text-danger">{errors.startDate}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="activity-end-date">תאריך סיום</Label>
                <Input
                  id="activity-end-date"
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
                  onClick={() => navigate('/activities')}
                >
                  ביטול
                </Button>
                <Button
                  type="submit"
                  loading={createActivityMutation.isPending}
                  disabled={createActivityMutation.isPending}
                >
                  יצירת תעסוקה
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </ContentContainer>
    </>
  )
}
