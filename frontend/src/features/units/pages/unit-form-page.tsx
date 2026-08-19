import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useAuthSession } from '@/app/auth/use-auth-session'
import { ContentContainer } from '@/app/layout/content-container'
import { PageHeader } from '@/app/layout/page-header'
import { useCreateUnit, useUnitById, useUpdateUnit } from '@/features/units/queries/use-units'
import { ErrorState } from '@/shared/components/error-state'
import { LoadingState } from '@/shared/components/loading-state'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'

interface UnitFormState {
  name: string
  description: string
  displayOrder: string
}

const createEmptyForm = (): UnitFormState => ({
  name: '',
  description: '',
  displayOrder: '0',
})

export function UnitFormPage() {
  const navigate = useNavigate()
  const { unitId } = useParams<{ unitId: string }>()
  const { user } = useAuthSession()
  const isEditMode = Boolean(unitId)
  const companyId = user?.companyId

  const unitQuery = useUnitById(unitId)
  const createUnitMutation = useCreateUnit()
  const updateUnitMutation = useUpdateUnit()

  const [form, setForm] = useState<UnitFormState>(createEmptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof UnitFormState, string>>>({})
  const [saveError, setSaveError] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!unitQuery.data) {
      if (!isEditMode) {
        setForm(createEmptyForm())
      }
      return
    }

    setForm({
      name: unitQuery.data.name ?? '',
      description: unitQuery.data.description ?? '',
      displayOrder: String(unitQuery.data.displayOrder ?? 0),
    })
  }, [isEditMode, unitQuery.data])

  const setValue = (field: keyof UnitFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setSaveError(undefined)
  }

  const validate = () => {
    const nextErrors: Partial<Record<keyof UnitFormState, string>> = {}

    if (!form.name.trim()) {
      nextErrors.name = 'יש להזין שם מסגרת.'
    }

    const trimmedDisplayOrder = form.displayOrder.trim()
    if (!trimmedDisplayOrder) {
      nextErrors.displayOrder = 'יש להזין סדר תצוגה.'
    } else {
      const parsedDisplayOrder = Number(trimmedDisplayOrder)
      if (!Number.isInteger(parsedDisplayOrder) || parsedDisplayOrder < 0) {
        nextErrors.displayOrder = 'סדר תצוגה חייב להיות מספר שלם גדול או שווה ל-0.'
      }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const onSubmit = async () => {
    if (!validate()) {
      return
    }

    try {
      const parsedDisplayOrder = Number(form.displayOrder)

      if (!isEditMode) {
        if (typeof companyId !== 'string' || companyId.length === 0) {
          throw new Error('לא קיים קונטקסט חברה מאומת.')
        }

        await createUnitMutation.mutateAsync({
          name: form.name.trim(),
          description: form.description.trim() || null,
          displayOrder: Number.isFinite(parsedDisplayOrder) ? parsedDisplayOrder : 0,
        })
        navigate('/units')
        return
      }

      if (!unitId) {
        return
      }

      await updateUnitMutation.mutateAsync({
        unitId,
        body: {
          name: form.name.trim(),
          description: form.description.trim() || null,
          displayOrder: Number.isFinite(parsedDisplayOrder) ? parsedDisplayOrder : 0,
        },
      })

      navigate('/units')
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'לא הצלחנו לשמור את המסגרת.')
    }
  }

  const title = isEditMode ? 'עריכת מסגרת' : 'יצירת מסגרת'

  if (isEditMode && unitQuery.isPending) {
    return (
      <>
        <PageHeader title={title} description="מכין את טופס המסגרת." />
        <ContentContainer className="pb-10">
          <LoadingState title="טוען מסגרת" description="הנתונים של המסגרת נטענים כעת." />
        </ContentContainer>
      </>
    )
  }

  if (isEditMode && unitQuery.isError) {
    return (
      <>
        <PageHeader title={title} description="לא ניתן לטעון את המסגרת." />
        <ContentContainer className="pb-10">
          <ErrorState
            title="טעינת המסגרת נכשלה"
            description="לא הצלחנו לטעון את המסגרת. אפשר לנסות שוב."
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
        description={isEditMode ? 'עדכון פרטי המסגרת בתוך הפלוגה.' : 'יצירת מסגרת חדשה בתוך הפלוגה הנוכחית.'}
      />

      <ContentContainer className="pb-10">
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {saveError ? (
              <ErrorState title="שמירת המסגרת נכשלה" description={saveError} />
            ) : null}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="unit-name">שם המסגרת</Label>
                <Input
                  id="unit-name"
                  value={form.name}
                  onChange={(event) => setValue('name', event.target.value)}
                  aria-invalid={errors.name ? 'true' : 'false'}
                />
                {errors.name ? <p className="text-sm text-danger">{errors.name}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit-description">תיאור</Label>
                <Input
                  id="unit-description"
                  value={form.description}
                  onChange={(event) => setValue('description', event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit-display-order">סדר תצוגה</Label>
                <Input
                  id="unit-display-order"
                  type="number"
                  value={form.displayOrder}
                  onChange={(event) => setValue('displayOrder', event.target.value)}
                  aria-invalid={errors.displayOrder ? 'true' : 'false'}
                />
                {errors.displayOrder ? <p className="text-sm text-danger">{errors.displayOrder}</p> : null}
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <Button type="button" variant="secondary" onClick={() => navigate('/units')}>
                  ביטול
                </Button>
                <Button
                  type="button"
                  onClick={() => void onSubmit()}
                  loading={createUnitMutation.isPending || updateUnitMutation.isPending}
                  disabled={createUnitMutation.isPending || updateUnitMutation.isPending}
                >
                  שמירת מסגרת
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </ContentContainer>
    </>
  )
}
