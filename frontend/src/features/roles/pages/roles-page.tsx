import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuthSession } from '@/app/auth/use-auth-session'
import { ContentContainer } from '@/app/layout/content-container'
import { PageHeader } from '@/app/layout/page-header'
import { useCompanyRoles, useDeleteRole } from '@/features/roles/queries/use-roles'
import { ErrorState } from '@/shared/components/error-state'
import { LoadingState } from '@/shared/components/loading-state'
import { Button } from '@/shared/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'

const PAGE_SIZE = 10

export function RolesPage() {
  const navigate = useNavigate()
  const { user } = useAuthSession()
  const companyId = user?.companyId
  const rolesQuery = useCompanyRoles(companyId)
  const deleteRoleMutation = useDeleteRole()
  const deleteInFlight = deleteRoleMutation?.isPending ?? false
  const [page, setPage] = useState(1)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const roles = rolesQuery.data ?? []
  const totalPages = Math.max(1, Math.ceil(roles.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  const pageRoles = useMemo(() => {
    const from = (safePage - 1) * PAGE_SIZE
    return roles.slice(from, from + PAGE_SIZE)
  }, [safePage, roles])

  const goToPreviousPage = () => setPage((current) => Math.max(1, current - 1))
  const goToNextPage = () => setPage((current) => Math.min(totalPages, current + 1))

  const onDelete = async (roleId: string) => {
    setPendingDeleteId(roleId)
    setDeleteError(null)

    try {
      await deleteRoleMutation.mutateAsync(roleId)
      setPendingDeleteId(null)
      setConfirmDeleteId(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'לא הצלחנו למחוק את התפקיד.'
      setDeleteError(message)
      setPendingDeleteId(null)
    }
  }

  return (
    <>
      <PageHeader
        title="תפקידים"
        description="רשימת התפקידים של החברה עם מידע בסיסי על כל תפקיד."
        actions={
          <Button type="button" onClick={() => navigate('/roles/new')}>
            יצירת תפקיד
          </Button>
        }
      />

      <ContentContainer className="space-y-5 pb-10">
        {deleteError ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {deleteError}
          </div>
        ) : null}

        {rolesQuery.isPending ? (
          <LoadingState title="טוען תפקידים" description="רשימת התפקידים נטענת כעת." />
        ) : rolesQuery.isError ? (
          <ErrorState
            title="טעינת תפקידים נכשלה"
            description="לא הצלחנו לטעון את רשימת התפקידים. אפשר לנסות שוב."
            action={
              <Button type="button" variant="secondary" onClick={() => void rolesQuery.refetch()}>
                ניסיון חוזר
              </Button>
            }
          />
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border border-border bg-surface">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>שם</TableHead>
                    <TableHead>תיאור</TableHead>
                    <TableHead className="w-32">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRoles.length > 0 ? (
                    pageRoles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell>{role.name}</TableCell>
                        <TableCell>{role.description ?? '—'}</TableCell>
                        <TableCell className="space-x-2">
                          <Button type="button" variant="secondary" size="sm" onClick={() => navigate(`/roles/${role.id}/edit`)}>
                            עריכה
                          </Button>
                          {confirmDeleteId === role.id ? (
                            <div className="inline-flex items-center gap-2 align-middle">
                              <span className="text-xs text-muted">האם למחוק את התפקיד?</span>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => void onDelete(role.id)}
                                disabled={pendingDeleteId === role.id || deleteInFlight}
                              >
                                {pendingDeleteId === role.id ? 'מוחק...' : 'אישור מחיקה'}
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => setConfirmDeleteId(null)}
                              >
                                ביטול
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => setConfirmDeleteId(role.id)}
                              disabled={deleteInFlight}
                            >
                              מחק
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="py-10 text-center text-muted">
                        אין תפקידים להצגה
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
              <div className="text-sm text-muted">
                {roles.length > 0 ? `עמוד ${safePage} מתוך ${totalPages}` : 'לא נמצאו תפקידים'}
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={goToPreviousPage} disabled={safePage <= 1}>
                  הקודם
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={goToNextPage} disabled={safePage >= totalPages}>
                  הבא
                </Button>
              </div>
            </div>
          </>
        )}
      </ContentContainer>
    </>
  )
}
