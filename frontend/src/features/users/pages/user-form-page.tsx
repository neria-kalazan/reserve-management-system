import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useAuthSession } from '@/app/auth/use-auth-session'
import { ContentContainer } from '@/app/layout/content-container'
import { PageHeader } from '@/app/layout/page-header'
import { useCompanyQualifications } from '@/features/qualifications/queries/use-qualifications'
import { useCompanyRoles } from '@/features/roles/queries/use-roles'
import { useCompanyUnits } from '@/features/units/queries/use-units'
import {
  assignUserQualification,
  assignUserRole,
  removeUserQualification,
  removeUserRole,
} from '@/features/users/api/users'
import {
  useCreateUser,
  useUpdateUser,
  useUserById,
  useUserQualifications,
  useUserRoles,
} from '@/features/users/queries/use-users'
import { ErrorState } from '@/shared/components/error-state'
import { LoadingState } from '@/shared/components/loading-state'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'

interface UserFormState {
  firstName: string
  lastName: string
  phone: string
  email: string
  personalNumber: string
  unitId: string
  isActive: boolean
  roleIds: string[]
  qualificationIds: string[]
}

const createEmptyForm = (): UserFormState => ({
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  personalNumber: '',
  unitId: '',
  isActive: true,
  roleIds: [],
  qualificationIds: [],
})

const toIdList = <T extends { id: string } | string>(items: T[] | undefined): string[] =>
  (items ?? []).map((item) => (typeof item === 'string' ? item : item.id))

export function UserFormPage() {
  const navigate = useNavigate()
  const { userId } = useParams<{ userId: string }>()
  const { user } = useAuthSession()
  const companyId = user?.companyId
  const isEditMode = Boolean(userId)

  const userQuery = useUserById(userId)
  const userRolesQuery = useUserRoles(userId)
  const userQualificationsQuery = useUserQualifications(userId)
  const unitsQuery = useCompanyUnits(companyId)
  const rolesQuery = useCompanyRoles(companyId)
  const qualificationsQuery = useCompanyQualifications(companyId)
  const createUserMutation = useCreateUser()
  const updateUserMutation = useUpdateUser()

  const [form, setForm] = useState<UserFormState>(createEmptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof UserFormState, string>>>({})
  const [saveError, setSaveError] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!userQuery.data) {
      if (!isEditMode) {
        setForm(createEmptyForm())
      }
      return
    }

    setForm({
      firstName: userQuery.data.firstName ?? '',
      lastName: userQuery.data.lastName ?? '',
      phone: userQuery.data.phone ?? '',
      email: userQuery.data.email ?? '',
      personalNumber: userQuery.data.personalNumber ?? '',
      unitId: userQuery.data.unit?.id ?? '',
      isActive: userQuery.data.isActive ?? true,
      roleIds: toIdList(userRolesQuery.data),
      qualificationIds: toIdList(userQualificationsQuery.data),
    })
  }, [isEditMode, userQuery.data, userQualificationsQuery.data, userRolesQuery.data])

  const unitOptions = useMemo(() => unitsQuery.data?.items ?? [], [unitsQuery.data])
  const roleOptions = useMemo(() => rolesQuery.data?.items ?? [], [rolesQuery.data])
  const qualificationOptions = useMemo(() => qualificationsQuery.data?.items ?? [], [qualificationsQuery.data])

  const isLoading =
    unitsQuery.isPending ||
    rolesQuery.isPending ||
    qualificationsQuery.isPending ||
    (isEditMode && (userQuery.isPending || userRolesQuery.isPending || userQualificationsQuery.isPending))

  const isError =
    unitsQuery.isError ||
    rolesQuery.isError ||
    qualificationsQuery.isError ||
    (isEditMode && (userQuery.isError || userRolesQuery.isError || userQualificationsQuery.isError))

  const setValue = (field: keyof UserFormState, value: string | boolean | string[]) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setSaveError(undefined)
  }

  const toggleRole = (roleId: string) => {
    setForm((current) => ({
      ...current,
      roleIds: current.roleIds.includes(roleId)
        ? current.roleIds.filter((id) => id !== roleId)
        : [...current.roleIds, roleId],
    }))
    setSaveError(undefined)
  }

  const toggleQualification = (qualificationId: string) => {
    setForm((current) => ({
      ...current,
      qualificationIds: current.qualificationIds.includes(qualificationId)
        ? current.qualificationIds.filter((id) => id !== qualificationId)
        : [...current.qualificationIds, qualificationId],
    }))
    setSaveError(undefined)
  }

  const validate = () => {
    const nextErrors: Partial<Record<keyof UserFormState, string>> = {}

    if (!form.firstName.trim()) {
      nextErrors.firstName = 'יש להזין שם פרטי.'
    }

    if (!form.lastName.trim()) {
      nextErrors.lastName = 'יש להזין שם משפחה.'
    }

    if (!form.personalNumber.trim()) {
      nextErrors.personalNumber = 'יש להזין מספר אישי.'
    }

    if (!form.phone.trim()) {
      nextErrors.phone = 'יש להזין טלפון.'
    }

    if (!form.unitId) {
      nextErrors.unitId = 'יש לבחור מסגרת.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const syncAssignments = async (targetUserId: string, nextRoleIds: string[], nextQualificationIds: string[]) => {
    const previousRoleIds = toIdList(userRolesQuery.data ?? [])
    const previousQualificationIds = toIdList(userQualificationsQuery.data ?? [])

    const roleAdds = nextRoleIds.filter((id) => !previousRoleIds.includes(id))
    const roleRemovals = previousRoleIds.filter((id) => !nextRoleIds.includes(id))
    const qualificationAdds = nextQualificationIds.filter((id) => !previousQualificationIds.includes(id))
    const qualificationRemovals = previousQualificationIds.filter((id) => !nextQualificationIds.includes(id))

    await Promise.all([
      ...roleAdds.map((roleId) => assignUserRole(targetUserId, roleId)),
      ...roleRemovals.map((roleId) => removeUserRole(targetUserId, roleId)),
      ...qualificationAdds.map((qualificationId) => assignUserQualification(targetUserId, qualificationId)),
      ...qualificationRemovals.map((qualificationId) => removeUserQualification(targetUserId, qualificationId)),
    ])
  }

  const onSubmit = async () => {
    if (!validate()) {
      return
    }

    try {
      if (!isEditMode) {
        const createdUser = await createUserMutation.mutateAsync({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          personalNumber: form.personalNumber.trim(),
          unitId: form.unitId,
        })

        await syncAssignments(createdUser.id, form.roleIds, form.qualificationIds)
        navigate('/users')
        return
      }

      if (!userId) {
        return
      }

      await updateUserMutation.mutateAsync({
        userId,
        body: {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          unitId: form.unitId,
          isActive: form.isActive,
        },
      })

      await syncAssignments(userId, form.roleIds, form.qualificationIds)
      navigate('/users')
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'לא הצלחנו לשמור את כוח האדם.')
    }
  }

  const title = isEditMode ? 'עריכת כוח אדם' : 'חייל חדש'

  if (isLoading) {
    return (
      <>
        <PageHeader title={title} description="מכין את טופס כוח האדם." />
        <ContentContainer className="pb-10">
          <LoadingState title="טוען אפשרויות כוח אדם" description="טוענים מסגרות, תפקידים והסמכות." />
        </ContentContainer>
      </>
    )
  }

  if (isError) {
    return (
      <>
        <PageHeader title={title} description="לא ניתן לטעון את נתוני כוח האדם." />
        <ContentContainer className="pb-10">
          <ErrorState
            title="טעינת נתוני כוח האדם נכשלה"
            description="לא הצלחנו לטעון את הנתונים הדרושים לטופס. אפשר לנסות שוב."
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
        description={isEditMode ? 'עדכון פרטי כוח האדם והקצאת תפקידים והסמכות.' : 'חייל חדש חדש בתוך הפלוגה הנוכחית.'}
      />

      <ContentContainer className="pb-10">
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first-name">שם פרטי</Label>
                <Input
                  id="first-name"
                  value={form.firstName}
                  onChange={(event) => setValue('firstName', event.target.value)}
                  aria-invalid={Boolean(errors.firstName)}
                />
                {errors.firstName ? <p className="text-sm text-danger">{errors.firstName}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last-name">שם משפחה</Label>
                <Input
                  id="last-name"
                  value={form.lastName}
                  onChange={(event) => setValue('lastName', event.target.value)}
                  aria-invalid={Boolean(errors.lastName)}
                />
                {errors.lastName ? <p className="text-sm text-danger">{errors.lastName}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="personal-number">מספר אישי</Label>
                <Input
                  id="personal-number"
                  value={form.personalNumber}
                  onChange={(event) => setValue('personalNumber', event.target.value)}
                  aria-invalid={Boolean(errors.personalNumber)}
                />
                {errors.personalNumber ? <p className="text-sm text-danger">{errors.personalNumber}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">טלפון</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(event) => setValue('phone', event.target.value)}
                  aria-invalid={Boolean(errors.phone)}
                />
                {errors.phone ? <p className="text-sm text-danger">{errors.phone}</p> : null}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="email">דוא"ל</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setValue('email', event.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="unit-select">מסגרת</Label>
                <select
                  id="unit-select"
                  value={form.unitId}
                  onChange={(event) => setValue('unitId', event.target.value)}
                  className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  aria-invalid={Boolean(errors.unitId)}
                >
                  <option value="">בחר מסגרת</option>
                  {unitOptions.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
                {errors.unitId ? <p className="text-sm text-danger">{errors.unitId}</p> : null}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <div className="text-sm font-semibold text-foreground">תפקידים</div>
                <div className="space-y-2">
                  {roleOptions.map((role) => (
                    <label key={role.id} className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={form.roleIds.includes(role.id)}
                        onChange={() => toggleRole(role.id)}
                        aria-label={role.name}
                      />
                      <span>{role.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold text-foreground">הסמכות</div>
                <div className="space-y-2">
                  {qualificationOptions.map((qualification) => (
                    <label key={qualification.id} className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={form.qualificationIds.includes(qualification.id)}
                        onChange={() => toggleQualification(qualification.id)}
                        aria-label={qualification.name}
                      />
                      <span>{qualification.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {saveError ? <p className="text-sm text-danger">{saveError}</p> : null}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="primary"
                loading={createUserMutation.isPending || updateUserMutation.isPending}
                onClick={() => void onSubmit()}
              >
                שמירת כוח אדם
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate('/users')}>
                ביטול
              </Button>
            </div>
          </CardContent>
        </Card>
      </ContentContainer>
    </>
  )
}
