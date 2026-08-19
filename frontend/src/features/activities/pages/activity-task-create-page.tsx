import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { ApiError } from '@/api/client'
import { ContentContainer } from '@/app/layout/content-container'
import { PageHeader } from '@/app/layout/page-header'
import { useCreateActivityTask } from '@/features/activities/queries/use-activity-tasks'
import { ErrorState } from '@/shared/components/error-state'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'

interface FormValues {
  name: string
  description: string
}

interface FormErrors {
  name: string | undefined
  description: string | undefined
  form: string | undefined
}

const initialValues: FormValues = {
  name: '',
  description: '',
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
      return 'אין הרשאה ליצור משימה במצב ההתחברות הנוכחי.'
    }
  }

  return 'לא הצלחנו ליצור את המשימה כעת. אפשר לנסות שוב.'
}

const validate = (values: FormValues): FormErrors => {
  const errors: FormErrors = {
    name: undefined,
    description: undefined,
    form: undefined,
  }

  if (values.name.trim().length === 0) {
    errors.name = 'יש להזין שם משימה.'
  }

  return errors
}

export function ActivityTaskCreatePage() {
  const navigate = useNavigate()
  const { activityId } = useParams<{ activityId: string }>()
  const createTaskMutation = useCreateActivityTask(activityId)

  const [values, setValues] = useState<FormValues>(initialValues)
  const [errors, setErrors] = useState<FormErrors>({
    name: undefined,
    description: undefined,
    form: undefined,
  })

  const updateField = <K extends keyof FormValues>(field: K, value: FormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }))
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors = validate(values)
    if (nextErrors.name) {
      setErrors(nextErrors)
      return
    }

    try {
      const payload = {
        name: values.name.trim(),
        ...(values.description.trim() ? { description: values.description.trim() } : {}),
      }

      await createTaskMutation.mutateAsync(payload)

      navigate(`/activities/${activityId}`)
    } catch (error) {
      setErrors((current) => ({
        ...current,
        form: toUserFacingError(error),
      }))
    }
  }

  if (!activityId) {
    return (
      <>
        <PageHeader title="יצירת משימה" description="לא התקבל מזהה פעילות חוקי." />
        <ContentContainer className="pb-10">
          <ErrorState
            title="מזהה פעילות חסר"
            description="לא ניתן ליצור משימה בלי מזהה פעילות תקין."
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
        title="יצירת משימה"
        description="הוספת משימה חדשה לפעילות נבחרת."
        actions={
          <Button type="button" variant="secondary" onClick={() => navigate(`/activities/${activityId}`)}>
            ביטול
          </Button>
        }
      />

      <ContentContainer className="pb-10">
        <Card>
          <CardHeader className="px-4 py-4 sm:px-5">
            <CardTitle className="text-base">פרטי משימה</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 px-4 pb-5 sm:px-5">
            {errors.form ? (
              <ErrorState title="השמירה נכשלה" description={errors.form} />
            ) : null}

            <form className="space-y-4" onSubmit={onSubmit} noValidate>
              <div className="space-y-2">
                <Label htmlFor="task-name">שם המשימה</Label>
                <Input
                  id="task-name"
                  name="name"
                  placeholder="לדוגמה: הכנה"
                  value={values.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  aria-invalid={errors.name ? 'true' : 'false'}
                />
                {errors.name ? <p className="text-sm text-danger">{errors.name}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-description">תיאור</Label>
                <Textarea
                  id="task-description"
                  name="description"
                  placeholder="הסבר קצר על המשימה"
                  value={values.description}
                  onChange={(event) => updateField('description', event.target.value)}
                  aria-invalid={errors.description ? 'true' : 'false'}
                />
                {errors.description ? <p className="text-sm text-danger">{errors.description}</p> : null}
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
                  loading={createTaskMutation.isPending}
                  disabled={createTaskMutation.isPending}
                >
                  יצירת משימה
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </ContentContainer>
    </>
  )
}
