import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuthSession } from '@/app/auth/use-auth-session'
import { ContentContainer } from '@/app/layout/content-container'
import { PageHeader } from '@/app/layout/page-header'
import { useCompanyUsers } from '@/features/users/queries/use-users'
import { ErrorState } from '@/shared/components/error-state'
import { LoadingState } from '@/shared/components/loading-state'
import { Button } from '@/shared/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'

const PAGE_SIZE = 10

export function UsersPage() {
  const navigate = useNavigate()
  const { user } = useAuthSession()
  const companyId = user?.companyId
  const usersQuery = useCompanyUsers(companyId)
  const [page, setPage] = useState(1)

  const users = usersQuery.data ?? []
  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  const pageUsers = useMemo(() => {
    const from = (safePage - 1) * PAGE_SIZE
    return users.slice(from, from + PAGE_SIZE)
  }, [safePage, users])

  const goToPreviousPage = () => setPage((current) => Math.max(1, current - 1))
  const goToNextPage = () => setPage((current) => Math.min(totalPages, current + 1))

  return (
    <>
      <PageHeader
        title="חיילים"
        description="רשימת חיילי החברה עם פרטים בסיסיים ומיקום יחידה."
        actions={
          <Button type="button" onClick={() => navigate('/users/new')}>
            יצירת חייל
          </Button>
        }
      />

      <ContentContainer className="space-y-5 pb-10">
        {usersQuery.isPending ? (
          <LoadingState title="טוען חיילים" description="רשימת החיילים נטענת כעת." />
        ) : usersQuery.isError ? (
          <ErrorState
            title="טעינת חיילים נכשלה"
            description="לא הצלחנו לטעון את רשימת החיילים. אפשר לנסות שוב."
            action={
              <Button type="button" variant="secondary" onClick={() => void usersQuery.refetch()}>
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
                    <TableHead>משפחה</TableHead>
                    <TableHead>מספר אישי</TableHead>
                    <TableHead>יחידה</TableHead>
                    <TableHead>טלפון</TableHead>
                    <TableHead>דוא"ל</TableHead>
                    <TableHead className="w-24">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageUsers.length > 0 ? (
                    pageUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.firstName}</TableCell>
                        <TableCell>{user.lastName}</TableCell>
                        <TableCell>{user.personalNumber}</TableCell>
                        <TableCell>{user.unit?.name ?? '—'}</TableCell>
                        <TableCell>{user.phone ?? '—'}</TableCell>
                        <TableCell>{user.email ?? '—'}</TableCell>
                        <TableCell>
                          <Button type="button" variant="secondary" size="sm" onClick={() => navigate(`/users/${user.id}/edit`)}>
                            עריכה
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted">
                        אין חיילים להצגה
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
              <div className="text-sm text-muted">
                {users.length > 0 ? `עמוד ${safePage} מתוך ${totalPages}` : 'לא נמצאו חיילים'}
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
