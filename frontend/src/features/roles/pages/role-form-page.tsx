import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useAuthSession } from '@/app/auth/use-auth-session'
import { ContentContainer } from '@/app/layout/content-container'
import { PageHeader } from '@/app/layout/page-header'
import { useCreateRole, useRoleById, useUpdateRole } from '@/features/roles/queries/use-roles'
import { ErrorState } from '@/shared/components/error-state'
import { LoadingState } from '@/shared/components/loading-state'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'

interface RoleFormState {
  name: string
  description: string
}

const createEmptyForm = (): RoleFormState => ({
  name: '',
  description: '',
})

export function RoleFormPage() {
  const navigate = useNavigate()
  const { roleId } = useParams<{ roleId: string }>()
  const { user } = useAuthSession()
  const isEditMode = Boolean(roleId)
  const companyId = user?.companyId

  const roleQuery = useRoleById(roleId)
  const createRoleMutation = useCreateRole()
  const updateRoleMutation = useUpdateRole()

  const [form, setForm] = useState<RoleFormState>(createEmptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof RoleFormState, string>>>({})
  const [saveError, setSaveError] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!roleQuery.data) {
      if (!isEditMode) {
        setForm(createEmptyForm())
      }
      return
    }

    setForm({
      name: roleQuery.data.name ?? '',
      description: roleQuery.data.description ?? '',
    })
  }, [isEditMode, roleQuery.data])

  const setValue = (field: keyof RoleFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setSaveError(undefined)
  }

  const validate = () => {
    const nextErrors: Partial<Record<keyof RoleFormState, string>> = {}

    if (!form.name.trim()) {
      nextErrors.name = 'יש להזין שם תפקיד.'
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

        await createRoleMutation.mutateAsync({
          name: form.name.trim(),
          description: form.description.trim() || null,
        })
        navigate('/roles')
        return
      }

      if (!roleId) {
        return
      }

      await updateRoleMutation.mutateAsync({
        roleId,
        body: {
          name: form.name.trim(),
          description: form.description.trim() || null,
        },
      })

      navigate('/roles')
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'לא הצלחנו לשמור את התפקיד.')
    }
  }

  const title = isEditMode ? 'עריכת תפקיד' : 'יצירת תפקיד'

  if (isEditMode && roleQuery.isPending) {
    return (
      <>
        <PageHeader title={title} description="מכין את טופס התפקיד." />
        <ContentContainer className="pb-10">
          <LoadingState title="טוען תפקיד" description="הנתונים של התפקיד נטענים כעת." />
        </ContentContainer>
      </>
    )
  }

  if (isEditMode && roleQuery.isError) {
    return (
      <>
        <PageHeader title={title} description="לא ניתן לטעון את תפקיד זה." />
        <ContentContainer className="pb-10">
          <ErrorState
            title="טעינת התפקיד נכשלה"
            description="לא הצלחנו לטעון את תפקיד זה. אפשר לנסות שוב."
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
        description={isEditMode ? 'עדכון פרטי התפקיד בתוך החברה.' : 'יצירת תפקיד חדש בתוך החברה הנוכחית.'}
      />

      <ContentContainer className="pb-10">
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {saveError ? (
              <ErrorState title="שמירת התפקיד נכשלה" description={saveError} />
            ) : null}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role-name">שם התפקיד</Label>
                <Input
                  id="role-name"
                  value={form.name}
                  onChange={(event) => setValue('name', event.target.value)}
                  aria-invalid={errors.name ? 'true' : 'false'}
                />
                {errors.name ? <p className="text-sm text-danger">{errors.name}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role-description">תיאור</Label>
                <Input
                  id="role-description"
                  value={form.description}
                  onChange={(event) => setValue('description', event.target.value)}
                />
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <Button type="button" variant="secondary" onClick={() => navigate('/roles')}>
                  ביטול
                </Button>
                <Button
                  type="button"
                  onClick={() => void onSubmit()}
                  loading={createRoleMutation.isPending || updateRoleMutation.isPending}
                  disabled={createRoleMutation.isPending || updateRoleMutation.isPending}
                >
                  שמירת תפקיד
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </ContentContainer>
    </>
  )
}
