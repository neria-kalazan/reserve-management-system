import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useAuthSession } from '@/app/auth/use-auth-session'
import { ContentContainer } from '@/app/layout/content-container'
import { PageHeader } from '@/app/layout/page-header'
import { useCreateQualification, useQualificationById, useUpdateQualification } from '@/features/qualifications/queries/use-qualifications'
import { ErrorState } from '@/shared/components/error-state'
import { LoadingState } from '@/shared/components/loading-state'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'

interface QualificationFormState {
  name: string
  description: string
}

const createEmptyForm = (): QualificationFormState => ({
  name: '',
  description: '',
})

export function QualificationFormPage() {
  const navigate = useNavigate()
  const { qualificationId } = useParams<{ qualificationId: string }>()
  const { user } = useAuthSession()
  const isEditMode = Boolean(qualificationId)
  const companyId = user?.companyId

  const qualificationQuery = useQualificationById(qualificationId)
  const createQualificationMutation = useCreateQualification()
  const updateQualificationMutation = useUpdateQualification()

  const [form, setForm] = useState<QualificationFormState>(createEmptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof QualificationFormState, string>>>({})
  const [saveError, setSaveError] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!qualificationQuery.data) {
      if (!isEditMode) {
        setForm(createEmptyForm())
      }
      return
    }

    setForm({
      name: qualificationQuery.data.name ?? '',
      description: qualificationQuery.data.description ?? '',
    })
  }, [isEditMode, qualificationQuery.data])

  const setValue = (field: keyof QualificationFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setSaveError(undefined)
  }

  const validate = () => {
    const nextErrors: Partial<Record<keyof QualificationFormState, string>> = {}

    if (!form.name.trim()) {
      nextErrors.name = 'יש להזין שם הסמכה.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const onSubmit = async () => {
    if (!validate()) {
      return
    }

    try {
      if (!isEditMode) {
        if (typeof companyId !== 'string' || companyId.length === 0) {
          throw new Error('לא קיים קונטקסט חברה מאומת.')
        }

        await createQualificationMutation.mutateAsync({
          name: form.name.trim(),
          description: form.description.trim() || null,
        })
        navigate('/qualifications')
        return
      }

      if (!qualificationId) {
        return
      }

      await updateQualificationMutation.mutateAsync({
        qualificationId,
        body: {
          name: form.name.trim(),
          description: form.description.trim() || null,
        },
      })

      navigate('/qualifications')
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'לא הצלחנו לשמור את ההסמכה.')
    }
  }

  const title = isEditMode ? 'עריכת הסמכה' : 'יצירת הסמכה'

  if (isEditMode && qualificationQuery.isPending) {
    return (
      <>
        <PageHeader title={title} description="מכין את טופס ההסמכה." />
        <ContentContainer className="pb-10">
          <LoadingState title="טוען הסמכה" description="הנתונים של ההסמכה נטענים כעת." />
        </ContentContainer>
      </>
    )
  }

  if (isEditMode && qualificationQuery.isError) {
    return (
      <>
        <PageHeader title={title} description="לא ניתן לטעון את ההסמכה." />
        <ContentContainer className="pb-10">
          <ErrorState
            title="טעינת ההסמכה נכשלה"
            description="לא הצלחנו לטעון את ההסמכה. אפשר לנסות שוב."
            action={
              <Button type="button" variant="secondary" onClick={() => window.location.reload()}>
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
        title={title}
        description={isEditMode ? 'עדכון פרטי ההסמכה בתוך הפלוגה.' : 'יצירת הסמכה חדשה בתוך הפלוגה הנוכחית.'}
      />

      <ContentContainer className="pb-10">
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {saveError ? (
              <ErrorState title="שמירת ההסמכה נכשלה" description={saveError} />
            ) : null}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="qualification-name">שם ההסמכה</Label>
                <Input
                  id="qualification-name"
                  value={form.name}
                  onChange={(event) => setValue('name', event.target.value)}
                  aria-invalid={errors.name ? 'true' : 'false'}
                />
                {errors.name ? <p className="text-sm text-danger">{errors.name}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="qualification-description">תיאור</Label>
                <Input
                  id="qualification-description"
                  value={form.description}
                  onChange={(event) => setValue('description', event.target.value)}
                />
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <Button type="button" variant="secondary" onClick={() => navigate('/qualifications')}>
                  ביטול
                </Button>
                <Button
                  type="button"
                  onClick={() => void onSubmit()}
                  loading={createQualificationMutation.isPending || updateQualificationMutation.isPending}
                  disabled={createQualificationMutation.isPending || updateQualificationMutation.isPending}
                >
                  שמירת הסמכה
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </ContentContainer>
    </>
  )
}
