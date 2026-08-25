import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { ApiError } from '@/api/client'
import { ContentContainer } from '@/app/layout/content-container'
import { PageHeader } from '@/app/layout/page-header'
import {
  updateActivityTaskRequirements,
} from '@/features/activities/api/activity-tasks'
import { useActivityById } from '@/features/activities/queries/use-activities'
import {
  useActivityTaskById,
  useActivityTaskRequirements,
  useCreateActivityTask,
  useUpdateActivityTask,
  useUpdateActivityTaskRequirements,
} from '@/features/activities/queries/use-activity-tasks'
import { useCompanyQualifications } from '@/features/qualifications/queries/use-qualifications'
import { useCompanyRoles } from '@/features/roles/queries/use-roles'
import { ErrorState } from '@/shared/components/error-state'
import { LoadingState } from '@/shared/components/loading-state'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { Trash2 } from 'lucide-react'

interface FormValues {
  name: string
  description: string
}

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

interface FormErrors {
  name: string | undefined
  description: string | undefined
  form: string | undefined
  requirements: string | undefined
}

const initialValues: FormValues = {
  name: '',
  description: '',
}

const initialRequirementsForm: RequirementsFormState = {
  manpowerRequired: false,
  manpowerQuantity: 0,
  roles: [],
  qualifications: [],
}

const isApiError = (value: unknown): value is ApiError => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    typeof (value as { status?: unknown }).status === 'number'
  )
}

const makeEntry = (kind: 'role' | 'qualification', selectedId: string): RequirementEntryState => ({
  key: `${kind}-${selectedId}-${Math.random().toString(36).slice(2, 9)}`,
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

const toQualificationEntryState = (
  entry: { qualificationId: string; required: boolean; quantity: number },
  seed: string,
): RequirementEntryState => ({
  key: seed,
  roleId: entry.qualificationId,
  required: entry.required,
  quantity: entry.quantity,
})

const toUserFacingError = (error: unknown, mode: 'create' | 'edit') => {
  if (isApiError(error)) {
    if (error.status === 400) {
      return 'הנתונים שהוזנו אינם תקינים. בדקו את השדות ונסו שוב.'
    }

    if (error.status === 401 || error.status === 403) {
      return mode === 'create' ? 'אין הרשאה ליצור משימה במצב ההתחברות הנוכחי.' : 'אין הרשאה לעדכן משימה במצב ההתחברות הנוכחי.'
    }
  }

  return mode === 'create' ? 'לא הצלחנו ליצור את המשימה כעת. אפשר לנסות שוב.' : 'לא הצלחנו לשמור את משימת הפעילות.'
}

const validateRequirements = (values: RequirementsFormState): string | undefined => {
  if (values.manpowerRequired && values.manpowerQuantity <= 0) {
    return 'כמות כוח אדם חייבת להיות גדולה מ-0.'
  }

  if (values.roles.some((entry) => entry.quantity <= 0)) {
    return 'כמות עבור דרישות תפקיד חייבת להיות גדולה מ-0.'
  }

  if (values.qualifications.some((entry) => entry.quantity <= 0)) {
    return 'כמות עבור דרישות הכשרה חייבת להיות גדולה מ-0.'
  }

  return undefined
}

const validate = (values: FormValues, requirements: RequirementsFormState): FormErrors => {
  const errors: FormErrors = {
    name: undefined,
    description: undefined,
    form: undefined,
    requirements: validateRequirements(requirements),
  }

  if (values.name.trim().length === 0) {
    errors.name = 'יש להזין שם משימה.'
  }

  return errors
}

export function ActivityTaskCreatePage() {
  const navigate = useNavigate()
  const { activityId, taskId } = useParams<{ activityId: string; taskId: string }>()
  const isEditMode = Boolean(taskId)

  const activityQuery = useActivityById(activityId) ?? {
    data: undefined,
    isPending: false,
    isError: false,
    refetch: async () => undefined,
  }
  const rolesQuery = useCompanyRoles(activityQuery.data?.companyId) ?? {
    data: { items: [], total: 0, page: 1, pageSize: 50 },
    isPending: false,
    isError: false,
    refetch: async () => undefined,
  }
  const qualificationsQuery = useCompanyQualifications(activityQuery.data?.companyId) ?? {
    data: { items: [], total: 0, page: 1, pageSize: 50 },
    isPending: false,
    isError: false,
    refetch: async () => undefined,
  }
  const taskQuery = useActivityTaskById(taskId) ?? {
    data: undefined,
    isPending: false,
    isError: false,
    refetch: async () => undefined,
  }
  const requirementsQuery = useActivityTaskRequirements(taskId) ?? {
    data: undefined,
    isPending: false,
    isError: false,
    refetch: async () => undefined,
  }
  const createTaskMutation = useCreateActivityTask(activityId) ?? {
    mutateAsync: async () => ({ id: 'new-task' }),
    isPending: false,
  }
  const updateTaskMutation = useUpdateActivityTask(taskId) ?? {
    mutateAsync: async () => undefined,
    isPending: false,
  }
  const updateRequirementsMutation = useUpdateActivityTaskRequirements(taskId) ?? {
    mutateAsync: async () => undefined,
    isPending: false,
  }

  const [values, setValues] = useState<FormValues>(initialValues)
  const [requirementsForm, setRequirementsForm] = useState<RequirementsFormState>(initialRequirementsForm)
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false)
  const [isQualificationModalOpen, setIsQualificationModalOpen] = useState(false)
  const [pendingRoleIds, setPendingRoleIds] = useState<string[]>([])
  const [pendingQualificationIds, setPendingQualificationIds] = useState<string[]>([])
  const [errors, setErrors] = useState<FormErrors>({
    name: undefined,
    description: undefined,
    form: undefined,
    requirements: undefined,
  })

  useEffect(() => {
    if (isEditMode && taskQuery.data) {
      setValues({
        name: taskQuery.data.name ?? '',
        description: taskQuery.data.description ?? '',
      })
    }

    if (!isEditMode) {
      setValues(initialValues)
    }
  }, [isEditMode, taskQuery.data])

  useEffect(() => {
    if (!isEditMode || !requirementsQuery.data) {
      if (!isEditMode) {
        setRequirementsForm(initialRequirementsForm)
      }
      return
    }

    setRequirementsForm({
      manpowerRequired: requirementsQuery.data.manpower?.required ?? false,
      manpowerQuantity: requirementsQuery.data.manpower?.quantity ?? 0,
      roles: requirementsQuery.data.roles.map((entry, index) =>
        toRoleEntryState(entry, `role-${entry.roleId}-${index}`),
      ),
      qualifications: requirementsQuery.data.qualifications.map((entry, index) =>
        toQualificationEntryState(entry, `qualification-${entry.qualificationId}-${index}`),
      ),
    })
  }, [isEditMode, requirementsQuery.data])

  const roleOptions = useMemo(() => rolesQuery.data?.items ?? [], [rolesQuery.data])
  const qualificationOptions = useMemo(() => qualificationsQuery.data?.items ?? [], [qualificationsQuery.data])

  const getRoleName = (roleId: string) => roleOptions.find((option) => option.id === roleId)?.name ?? roleId
  const getQualificationName = (qualificationId: string) =>
    qualificationOptions.find((option) => option.id === qualificationId)?.name ?? qualificationId

  const updateField = <K extends keyof FormValues>(field: K, value: FormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }))
  }

  const onManpowerChange = (field: 'required' | 'quantity', value: boolean | number) => {
    setRequirementsForm((current) => ({
      ...current,
      manpowerRequired: field === 'required' ? Boolean(value) : current.manpowerRequired,
      manpowerQuantity: field === 'quantity' ? Number(value) || 0 : current.manpowerQuantity,
    }))
    setErrors((current) => ({ ...current, requirements: undefined, form: undefined }))
  }

  const setRoleEntry = (key: string, patch: Partial<RequirementEntryState>) => {
    setRequirementsForm((current) => ({
      ...current,
      roles: current.roles.map((entry) => (entry.key === key ? { ...entry, ...patch } : entry)),
    }))
    setErrors((current) => ({ ...current, requirements: undefined, form: undefined }))
  }

  const setQualificationEntry = (key: string, patch: Partial<RequirementEntryState>) => {
    setRequirementsForm((current) => ({
      ...current,
      qualifications: current.qualifications.map((entry) => (entry.key === key ? { ...entry, ...patch } : entry)),
    }))
    setErrors((current) => ({ ...current, requirements: undefined, form: undefined }))
  }

  const openRoleSelector = () => {
    setPendingRoleIds(requirementsForm.roles.map((entry) => entry.roleId))
    setIsRoleModalOpen(true)
  }

  const openQualificationSelector = () => {
    setPendingQualificationIds(requirementsForm.qualifications.map((entry) => entry.roleId))
    setIsQualificationModalOpen(true)
  }

  const confirmRoleSelection = () => {
    setRequirementsForm((current) => ({
      ...current,
      roles: roleOptions
        .filter((option) => pendingRoleIds.includes(option.id))
        .map((option) => {
          const existing = current.roles.find((entry) => entry.roleId === option.id)
          return existing ? { ...existing } : makeEntry('role', option.id)
        }),
    }))
    setIsRoleModalOpen(false)
    setErrors((current) => ({ ...current, requirements: undefined, form: undefined }))
  }

  const confirmQualificationSelection = () => {
    setRequirementsForm((current) => ({
      ...current,
      qualifications: qualificationOptions
        .filter((option) => pendingQualificationIds.includes(option.id))
        .map((option) => {
          const existing = current.qualifications.find((entry) => entry.roleId === option.id)
          return existing ? { ...existing } : makeEntry('qualification', option.id)
        }),
    }))
    setIsQualificationModalOpen(false)
    setErrors((current) => ({ ...current, requirements: undefined, form: undefined }))
  }

  const removeRoleEntry = (key: string) => {
    setRequirementsForm((current) => ({
      ...current,
      roles: current.roles.filter((entry) => entry.key !== key),
    }))
  }

  const removeQualificationEntry = (key: string) => {
    setRequirementsForm((current) => ({
      ...current,
      qualifications: current.qualifications.filter((entry) => entry.key !== key),
    }))
  }

  const buildRequirementsPayload = () => ({
    manpower: {
      required: requirementsForm.manpowerRequired,
      quantity: requirementsForm.manpowerQuantity,
    },
    roles: requirementsForm.roles.map((entry) => ({
      roleId: entry.roleId,
      required: entry.required,
      quantity: entry.quantity,
    })),
    qualifications: requirementsForm.qualifications.map((entry) => ({
      qualificationId: entry.roleId,
      required: entry.required,
      quantity: entry.quantity,
    })),
  })

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors = validate(values, requirementsForm)
    if (nextErrors.name || nextErrors.requirements) {
      setErrors(nextErrors)
      return
    }

    try {
      const payload = {
        name: values.name.trim(),
        ...(values.description.trim() ? { description: values.description.trim() } : {}),
      }

      if (isEditMode && taskId) {
        await updateTaskMutation.mutateAsync(payload)
        await updateRequirementsMutation.mutateAsync(buildRequirementsPayload())
        navigate(`/activities/${activityId}/tasks`)
        return
      }

      if (!activityId) {
        throw new Error('Missing activity identifier.')
      }

      const createdTask = await createTaskMutation.mutateAsync(payload)
      const hasConfiguredRequirements =
        requirementsForm.manpowerRequired ||
        requirementsForm.manpowerQuantity > 0 ||
        requirementsForm.roles.length > 0 ||
        requirementsForm.qualifications.length > 0

      if (createdTask?.id && hasConfiguredRequirements) {
        await updateActivityTaskRequirements(createdTask.id, buildRequirementsPayload())
      }

      navigate(`/activities/${activityId}/tasks`)
    } catch (error) {
      setErrors((current) => ({
        ...current,
        form: toUserFacingError(error, isEditMode ? 'edit' : 'create'),
      }))
    }
  }

  if (!activityId) {
    return (
      <>
        <PageHeader title={isEditMode ? 'עריכת משימה' : 'יצירת משימה'} description="לא התקבל מזהה פעילות חוקי." />
        <ContentContainer className="pb-10">
          <ErrorState
            title="מזהה פעילות חסר"
            description="לא ניתן לטעון משימה בלי מזהה פעילות תקין."
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

  if (isEditMode && taskQuery.isPending) {
    return (
      <>
        <PageHeader title="עריכת משימה" description="מכין את פרטי המשימה." />
        <ContentContainer className="pb-10">
          <LoadingState title="טוען משימה" description="הנתונים של המשימה נטענים כעת." />
        </ContentContainer>
      </>
    )
  }

  if (isEditMode && taskQuery.isError) {
    return (
      <>
        <PageHeader title="עריכת משימה" description="לא ניתן לטעון את המשימה." />
        <ContentContainer className="pb-10">
          <ErrorState
            title="טעינת המשימה נכשלה"
            description="לא הצלחנו לטעון את משימה זו. אפשר לנסות שוב."
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

  const isRequirementsLoading = isEditMode && (requirementsQuery.isPending || rolesQuery.isPending || qualificationsQuery.isPending)

  return (
    <>
      <PageHeader
        title={isEditMode ? 'עריכת משימה' : 'יצירת משימה'}
        description={isEditMode ? 'עדכון פרטי משימה ודרישותיה.' : 'הוספת משימה חדשה לפעילות נבחרת.'}
        actions={
          <Button type="button" variant="secondary" onClick={() => navigate(`/activities/${activityId}`)}>
            ביטול
          </Button>
        }
      />

      <ContentContainer className="pb-10">
        <Dialog open={isRoleModalOpen} onOpenChange={(open) => {
          if (!open) {
            setIsRoleModalOpen(false)
          }
        }}>
          <DialogContent className="max-w-md" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>בחירת תפקידים</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {roleOptions.length === 0 ? (
                <p className="text-sm text-muted">אין תפקידים זמינים בחברה.</p>
              ) : (
                roleOptions.map((option) => (
                  <label key={option.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2 text-right">
                    <span className="text-sm text-foreground">{option.name}</span>
                    <input
                      type="checkbox"
                      checked={pendingRoleIds.includes(option.id)}
                      onChange={(event) => {
                        const next = event.target.checked
                          ? [...pendingRoleIds, option.id]
                          : pendingRoleIds.filter((id) => id !== option.id)
                        setPendingRoleIds(next)
                      }}
                    />
                  </label>
                ))
              )}
            </div>
            <DialogFooter className="sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => setIsRoleModalOpen(false)}>
                ביטול
              </Button>
              <Button type="button" onClick={confirmRoleSelection}>
                אישור
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isQualificationModalOpen} onOpenChange={(open) => {
          if (!open) {
            setIsQualificationModalOpen(false)
          }
        }}>
          <DialogContent className="max-w-md" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>בחירת הסמכות</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {qualificationOptions.length === 0 ? (
                <p className="text-sm text-muted">אין הסמכות זמינות בחברה.</p>
              ) : (
                qualificationOptions.map((option) => (
                  <label key={option.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2 text-right">
                    <span className="text-sm text-foreground">{option.name}</span>
                    <input
                      type="checkbox"
                      checked={pendingQualificationIds.includes(option.id)}
                      onChange={(event) => {
                        const next = event.target.checked
                          ? [...pendingQualificationIds, option.id]
                          : pendingQualificationIds.filter((id) => id !== option.id)
                        setPendingQualificationIds(next)
                      }}
                    />
                  </label>
                ))
              )}
            </div>
            <DialogFooter className="sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => setIsQualificationModalOpen(false)}>
                ביטול
              </Button>
              <Button type="button" onClick={confirmQualificationSelection}>
                אישור
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader className="px-4 py-4 sm:px-5">
            <CardTitle className="text-base">{isEditMode ? 'פרטי משימה' : 'פרטי משימה'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 px-4 pb-5 sm:px-5">
            {errors.form ? <ErrorState title="השמירה נכשלה" description={errors.form} /> : null}
            {errors.requirements ? <ErrorState title="השמירה נכשלה" description={errors.requirements} /> : null}

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

              {!isRequirementsLoading ? (
                <div className="space-y-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-sm font-medium text-foreground">תפקידים</Label>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={openRoleSelector}
                        disabled={roleOptions.length === 0}
                      >
                        הוספת תפקיד
                      </Button>
                    </div>

                    {requirementsForm.roles.length > 0 ? (
                      requirementsForm.roles.map((entry) => (
                        <div key={entry.key} className="rounded-md border border-border bg-surface px-3 py-3">
                          <div dir="rtl" className="flex flex-wrap items-center gap-3 gap-y-2">
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <span className="shrink-0 text-sm font-medium text-muted-foreground">תפקיד:</span>
                              <span className="min-w-0 truncate text-sm text-foreground">{getRoleName(entry.roleId)}</span>
                            </div>

                            <div className="flex flex-2 items-center gap-2">
                              <Label className="shrink-0 text-sm text-muted-foreground">כמות:</Label>
                              <Input
                                type="number"
                                min={0}
                                value={entry.quantity}
                                className="h-9 w-20"
                                onChange={(event) => setRoleEntry(entry.key, { quantity: Number(event.target.value) || 0 })}
                              />
                            </div>

                            <label className="flex flex-3 shrink-0 items-center gap-2 text-sm text-muted-foreground">
                              <input
                                type="checkbox"
                                checked={entry.required}
                                onChange={(event) => setRoleEntry(entry.key, { required: event.target.checked })}
                              />
                              הכרחי
                            </label>

                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="h-9 w-9"
                              aria-label="הסרת תפקיד"
                              onClick={() => removeRoleEntry(entry.key)}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </Button>
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
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={openQualificationSelector}
                        disabled={qualificationOptions.length === 0}
                      >
                        הוספת הסמכה
                      </Button>
                    </div>

                    {requirementsForm.qualifications.length > 0 ? (
                      requirementsForm.qualifications.map((entry) => (
                        <div key={entry.key} className="rounded-md border border-border bg-surface px-3 py-3">
                          <div dir="rtl" className="flex flex-wrap items-center gap-3 gap-y-2">
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <span className="shrink-0 text-sm font-medium text-muted-foreground">הסמכה:</span>
                              <span className="min-w-0 truncate text-sm text-foreground">{getQualificationName(entry.roleId)}</span>
                            </div>

                            <div className="flex flex-2 items-center gap-2">
                              <Label className="shrink-0 text-sm text-muted-foreground">כמות:</Label>
                              <Input
                                type="number"
                                min={0}
                                value={entry.quantity}
                                className="h-9 w-20"
                                onChange={(event) =>
                                  setQualificationEntry(entry.key, { quantity: Number(event.target.value) || 0 })
                                }
                              />
                            </div>

                            <label className="flex flex-3 shrink-0 items-center gap-2 text-sm text-muted-foreground">
                              <input
                                type="checkbox"
                                checked={entry.required}
                                onChange={(event) => setQualificationEntry(entry.key, { required: event.target.checked })}
                              />
                              הכרחי
                            </label>

                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="h-9 w-9"
                              aria-label="הסרת הסמכה"
                              onClick={() => removeQualificationEntry(entry.key)}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted">אין דרישות הכשרות מוגדרות.</p>
                    )}
                  </div>

                  <div className="space-y-3 rounded-md border border-border bg-surface-elevated p-3">
                    <div dir="rtl" className="flex flex-wrap items-center gap-3 gap-y-2">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="shrink-0 text-sm font-medium text-muted-foreground">סד"כ:</span>
                      </div>

                      <div className="flex flex-2 items-center gap-2">
                        <Label htmlFor="manpower-quantity" className="shrink-0 text-sm text-muted-foreground">כמות:</Label>
                        <Input
                          id="manpower-quantity"
                          type="number"
                          min={0}
                          className="h-9 w-20"
                          aria-label="כמות"
                          value={requirementsForm.manpowerQuantity}
                          onChange={(event) => onManpowerChange('quantity', Number(event.target.value) || 0)}
                        />
                      </div>
                      <label className="flex flex-3 shrink-0 items-center gap-2 text-sm text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={requirementsForm.manpowerRequired}
                          onChange={(event) => onManpowerChange('required', event.target.checked)}
                        />
                        הכרחי
                      </label>

                      <div className="h-9 w-9"></div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" onClick={() => navigate(`/activities/${activityId}`)}>
                  ביטול
                </Button>
                <Button
                  type="submit"
                  loading={createTaskMutation.isPending || updateTaskMutation.isPending || updateRequirementsMutation.isPending}
                  disabled={createTaskMutation.isPending || updateTaskMutation.isPending || updateRequirementsMutation.isPending}
                >
                  {isEditMode ? 'שמירת משימה' : 'יצירת משימה'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </ContentContainer>
    </>
  )
}
