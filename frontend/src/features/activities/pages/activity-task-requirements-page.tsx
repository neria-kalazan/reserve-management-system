import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { ApiError } from '@/api/client'
import { ContentContainer } from '@/app/layout/content-container'
import { PageHeader } from '@/app/layout/page-header'
import { useActivityById } from '@/features/activities/queries/use-activities'
import {
  useActivityTaskRequirements,
  useCompanyQualifications,
  useCompanyRoles,
  useUpdateActivityTaskRequirements,
} from '@/features/activities/queries/use-activity-tasks'
import { ErrorState } from '@/shared/components/error-state'
import { LoadingState } from '@/shared/components/loading-state'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'

interface RequirementEntryState {
  key: string
  roleId: string
  required: boolean
  quantity: number
}

interface RequirementsFormState {
  manpowerRequired: boolean
  manpowerQuantity: number
  roles: RequirementEntryState[]
  qualifications: RequirementEntryState[]
}

const isApiError = (value: unknown): value is ApiError => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    typeof (value as { status?: unknown }).status === 'number'
  )
}

const makeEntry = (id: string, selectedId: string) => ({
  key: `${id}-${selectedId}-${Math.random().toString(36).slice(2, 9)}`,
  roleId: selectedId,
  required: true,
  quantity: 1,
})

const toRoleEntryState = (entry: { roleId: string; required: boolean; quantity: number }, seed: string): RequirementEntryState => ({
  key: seed,
  roleId: entry.roleId,
  required: entry.required,
  quantity: entry.quantity,
})

const toQualificationEntryState = (entry: { qualificationId: string; required: boolean; quantity: number }, seed: string): RequirementEntryState => ({
  key: seed,
  roleId: entry.qualificationId,
  required: entry.required,
  quantity: entry.quantity,
})

export function ActivityTaskRequirementsPage() {
  const navigate = useNavigate()
  const { activityId, taskId } = useParams<{ activityId: string; taskId: string }>()
  const activityQuery = useActivityById(activityId)
  const rolesQuery = useCompanyRoles(activityQuery.data?.companyId)
  const qualificationsQuery = useCompanyQualifications(activityQuery.data?.companyId)
  const requirementsQuery = useActivityTaskRequirements(taskId)
  const updateRequirementsMutation = useUpdateActivityTaskRequirements(taskId)

  const [form, setForm] = useState<RequirementsFormState>({
    manpowerRequired: false,
    manpowerQuantity: 0,
    roles: [],
    qualifications: [],
  })
  const [saveError, setSaveError] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!requirementsQuery.data) {
      return
    }

    setForm({
      manpowerRequired: requirementsQuery.data.manpower?.required ?? false,
      manpowerQuantity: requirementsQuery.data.manpower?.quantity ?? 0,
      roles: requirementsQuery.data.roles.map((entry, index) =>
        toRoleEntryState(entry, `role-${entry.roleId}-${index}`),
      ),
      qualifications: requirementsQuery.data.qualifications.map((entry, index) =>
        toQualificationEntryState(entry, `qualification-${entry.qualificationId}-${index}`),
      ),
    })
  }, [requirementsQuery.data])

  const roleOptions = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data])
  const qualificationOptions = useMemo(() => qualificationsQuery.data ?? [], [qualificationsQuery.data])

  const onManpowerChange = (field: 'required' | 'quantity', value: boolean | number) => {
    setForm((current) => ({
      ...current,
      manpowerRequired: field === 'required' ? Boolean(value) : current.manpowerRequired,
      manpowerQuantity: field === 'quantity' ? Number(value) : current.manpowerQuantity,
    }))
    setSaveError(undefined)
  }

  const setRoleEntry = (key: string, patch: Partial<RequirementEntryState>) => {
    setForm((current) => ({
      ...current,
      roles: current.roles.map((entry) => (entry.key === key ? { ...entry, ...patch } : entry)),
    }))
    setSaveError(undefined)
  }

  const setQualificationEntry = (key: string, patch: Partial<RequirementEntryState>) => {
    setForm((current) => ({
      ...current,
      qualifications: current.qualifications.map((entry) => (entry.key === key ? { ...entry, ...patch } : entry)),
    }))
    setSaveError(undefined)
  }

  const addRoleEntry = () => {
    const nextAvailable = roleOptions.find((option) => !form.roles.some((entry) => entry.roleId === option.id))
    if (!nextAvailable) {
      return
    }

    setForm((current) => ({
      ...current,
      roles: [...current.roles, makeEntry('role', nextAvailable.id)],
    }))
  }

  const addQualificationEntry = () => {
    const nextAvailable = qualificationOptions.find((option) => !form.qualifications.some((entry) => entry.roleId === option.id))
    if (!nextAvailable) {
      return
    }

    setForm((current) => ({
      ...current,
      qualifications: [...current.qualifications, makeEntry('qualification', nextAvailable.id)],
    }))
  }

  const removeRoleEntry = (key: string) => {
    setForm((current) => ({
      ...current,
      roles: current.roles.filter((entry) => entry.key !== key),
    }))
  }

  const removeQualificationEntry = (key: string) => {
    setForm((current) => ({
      ...current,
      qualifications: current.qualifications.filter((entry) => entry.key !== key),
    }))
  }

  const onSubmit = async () => {
    try {
      await updateRequirementsMutation.mutateAsync({
        manpower: {
          required: form.manpowerRequired,
          quantity: form.manpowerQuantity,
        },
        roles: form.roles.map((entry) => ({
          roleId: entry.roleId,
          required: entry.required,
          quantity: entry.quantity,
        })),
        qualifications: form.qualifications.map((entry) => ({
          qualificationId: entry.roleId,
          required: entry.required,
          quantity: entry.quantity,
        })),
      })
      navigate(`/activities/${activityId}`)
    } catch (error) {
      const message = isApiError(error)
        ? error.message
        : 'לא הצלחנו לשמור את דרישות המשימה.'
      setSaveError(message)
    }
  }

  if (!activityId || !taskId) {
    return (
      <>
        <PageHeader title="דרישות משימה" description="לא התקבלו מזהים תקינים." />
        <ContentContainer className="pb-10">
          <ErrorState
            title="מזהה משימה חסר"
            description="לא ניתן לטעון דרישות בלי מזהה משימה תקין."
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

  const isLoading = activityQuery.isPending || requirementsQuery.isPending || rolesQuery.isPending || qualificationsQuery.isPending
  const isError = activityQuery.isError || requirementsQuery.isError || rolesQuery.isError || qualificationsQuery.isError

  return (
    <>
      <PageHeader
        title={activityQuery.data?.name ?? 'דרישות משימה'}
        description="ניהול דרישות כוח אדם, תפקידים והכשרות עבור משימה נבחרת."
        actions={
          <Button type="button" variant="secondary" onClick={() => navigate(`/activities/${activityId}`)}>
            חזרה לפרטי פעילות
          </Button>
        }
      />

      <ContentContainer className="space-y-5 pb-10">
        {isLoading ? (
          <LoadingState title="טוען דרישות" description="הנתונים של המשימה והדרישות נטענים כעת." />
        ) : isError ? (
          <ErrorState
            title="טעינת דרישות נכשלה"
            description="לא הצלחנו לטעון את דרישות המשימה. אפשר לנסות שוב."
            action={
              <Button type="button" variant="secondary" onClick={() => void requirementsQuery.refetch()}>
                ניסיון חוזר
              </Button>
            }
          />
        ) : (
          <>
            <Card>
              <CardHeader className="px-4 py-4 sm:px-5">
                <CardTitle className="text-base">דרישות משימה</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 px-4 pb-5 sm:px-5">
                {saveError ? <ErrorState title="השמירה נכשלה" description={saveError} /> : null}

                <div className="space-y-3 rounded-md border border-border bg-surface-elevated p-3">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="text-sm font-medium text-foreground">כוח אדם</Label>
                    <label className="flex items-center gap-2 text-sm text-muted">
                      <input
                        type="checkbox"
                        checked={form.manpowerRequired}
                        onChange={(event) => onManpowerChange('required', event.target.checked)}
                      />
                      נדרש
                    </label>
                  </div>

                  <div className="max-w-40 space-y-2">
                    <Label htmlFor="manpower-quantity">כמות</Label>
                    <Input
                      id="manpower-quantity"
                      type="number"
                      min={0}
                      value={form.manpowerQuantity}
                      onChange={(event) => onManpowerChange('quantity', Number(event.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-sm font-medium text-foreground">תפקידים</Label>
                    <Button type="button" variant="secondary" size="sm" onClick={addRoleEntry} disabled={roleOptions.length === 0 || form.roles.length >= roleOptions.length}>
                      הוספת תפקיד
                    </Button>
                  </div>

                  {form.roles.length > 0 ? (
                    form.roles.map((entry) => (
                      <div key={entry.key} className="rounded-md border border-border bg-surface px-3 py-3">
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_120px_80px]">
                          <div className="space-y-2">
                            <Label>תפקיד</Label>
                            <Select
                              value={entry.roleId}
                              onValueChange={(value) => setRoleEntry(entry.key, { roleId: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="בחר תפקיד" />
                              </SelectTrigger>
                              <SelectContent>
                                {roleOptions.map((option) => (
                                  <SelectItem key={option.id} value={option.id}>
                                    {option.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>כמות</Label>
                            <Input
                              type="number"
                              min={0}
                              value={entry.quantity}
                              onChange={(event) => setRoleEntry(entry.key, { quantity: Number(event.target.value) || 0 })}
                            />
                          </div>

                          <div className="flex items-end justify-end gap-2">
                            <label className="flex items-center gap-2 text-sm text-muted">
                              <input
                                type="checkbox"
                                checked={entry.required}
                                onChange={(event) => setRoleEntry(entry.key, { required: event.target.checked })}
                              />
                              נדרש
                            </label>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeRoleEntry(entry.key)}>
                              הסרה
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted">אין דרישות תפקידים מוגדרות.</p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-sm font-medium text-foreground">הכשרות</Label>
                    <Button type="button" variant="secondary" size="sm" onClick={addQualificationEntry} disabled={qualificationOptions.length === 0 || form.qualifications.length >= qualificationOptions.length}>
                      הוספת הכשרה
                    </Button>
                  </div>

                  {form.qualifications.length > 0 ? (
                    form.qualifications.map((entry) => (
                      <div key={entry.key} className="rounded-md border border-border bg-surface px-3 py-3">
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_120px_80px]">
                          <div className="space-y-2">
                            <Label>הכשרה</Label>
                            <Select
                              value={entry.roleId}
                              onValueChange={(value) => setQualificationEntry(entry.key, { roleId: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="בחר הכשרה" />
                              </SelectTrigger>
                              <SelectContent>
                                {qualificationOptions.map((option) => (
                                  <SelectItem key={option.id} value={option.id}>
                                    {option.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>כמות</Label>
                            <Input
                              type="number"
                              min={0}
                              value={entry.quantity}
                              onChange={(event) => setQualificationEntry(entry.key, { quantity: Number(event.target.value) || 0 })}
                            />
                          </div>

                          <div className="flex items-end justify-end gap-2">
                            <label className="flex items-center gap-2 text-sm text-muted">
                              <input
                                type="checkbox"
                                checked={entry.required}
                                onChange={(event) => setQualificationEntry(entry.key, { required: event.target.checked })}
                              />
                              נדרש
                            </label>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeQualificationEntry(entry.key)}>
                              הסרה
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted">אין דרישות הכשרות מוגדרות.</p>
                  )}
                </div>

                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => navigate(`/activities/${activityId}`)}>
                    ביטול
                  </Button>
                  <Button
                    type="button"
                    loading={updateRequirementsMutation.isPending}
                    disabled={updateRequirementsMutation.isPending}
                    onClick={() => void onSubmit()}
                  >
                    שמירת דרישות
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </ContentContainer>
    </>
  )
}
