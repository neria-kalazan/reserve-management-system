import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuthSession } from '@/app/auth/use-auth-session'
import { ContentContainer } from '@/app/layout/content-container'
import { PageHeader } from '@/app/layout/page-header'
import { useCompanyRoles } from '@/features/roles/queries/use-roles'
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
  const [page, setPage] = useState(1)

  const roles = rolesQuery.data ?? []
  const totalPages = Math.max(1, Math.ceil(roles.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  const pageRoles = useMemo(() => {
    const from = (safePage - 1) * PAGE_SIZE
    return roles.slice(from, from + PAGE_SIZE)
  }, [safePage, roles])

  const goToPreviousPage = () => setPage((current) => Math.max(1, current - 1))
  const goToNextPage = () => setPage((current) => Math.min(totalPages, current + 1))

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
                    <TableHead className="w-24">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRoles.length > 0 ? (
                    pageRoles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell>{role.name}</TableCell>
                        <TableCell>{role.description ?? '—'}</TableCell>
                        <TableCell>
                          <Button type="button" variant="secondary" size="sm" onClick={() => navigate(`/roles/${role.id}/edit`)}>
                            עריכה
                          </Button>
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
