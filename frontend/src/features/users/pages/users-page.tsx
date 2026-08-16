import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuthSession } from '@/app/auth/use-auth-session'
import { ContentContainer } from '@/app/layout/content-container'
import { PageHeader } from '@/app/layout/page-header'
import { type UserImportResult } from '@/features/users/api/users'
import { useCompanyUsers, useDeactivateUser, useImportCompanyUsers } from '@/features/users/queries/use-users'
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
  const importUsersMutation = useImportCompanyUsers()
  const deactivateUserMutation = useDeactivateUser()
  const deactivateInFlight = deactivateUserMutation?.isPending ?? false
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [page, setPage] = useState(1)
  const [importError, setImportError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<UserImportResult | null>(null)
  const [pendingDeactivateId, setPendingDeactivateId] = useState<string | null>(null)
  const [confirmDeactivateId, setConfirmDeactivateId] = useState<string | null>(null)
  const [deactivateError, setDeactivateError] = useState<string | null>(null)

  const users = usersQuery.data ?? []
  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  const pageUsers = useMemo(() => {
    const from = (safePage - 1) * PAGE_SIZE
    return users.slice(from, from + PAGE_SIZE)
  }, [safePage, users])

  const goToPreviousPage = () => setPage((current) => Math.max(1, current - 1))
  const goToNextPage = () => setPage((current) => Math.min(totalPages, current + 1))

  const handleImportClick = () => {
    setImportError(null)
    fileInputRef.current?.click()
  }

  const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    event.target.value = ''

    if (!selectedFile) {
      setImportError('לא נבחר קובץ לייבוא.')
      return
    }

    const isCsvFile = selectedFile.name.toLowerCase().endsWith('.csv') || selectedFile.type.includes('csv')
    if (!isCsvFile) {
      setImportError('קובץ לא תקין. בחר קובץ CSV בלבד.')
      return
    }

    try {
      const result = await importUsersMutation.mutateAsync(selectedFile)
      setImportResult(result)
      setImportError(null)
    } catch (error: unknown) {
      const message = error instanceof Error && error.message ? error.message : 'הייבוא נכשל. נסה שוב.'
      setImportError(message)
      setImportResult(null)
    }
  }

  const onDeactivate = async (userId: string) => {
    setPendingDeactivateId(userId)
    setDeactivateError(null)

    try {
      await deactivateUserMutation.mutateAsync(userId)
      setPendingDeactivateId(null)
      setConfirmDeactivateId(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'לא הצלחנו להפסיק את פעילות האדם.'
      setDeactivateError(message)
      setPendingDeactivateId(null)
    }
  }

  return (
    <>
      <PageHeader
        title="כוח אדם"
        description="רשימת אנשי החברה עם פרטים בסיסיים ומיקום יחידה."
        actions={
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={handleImportClick} disabled={importUsersMutation.isPending}>
              {importUsersMutation.isPending ? 'מייבא...' : 'ייבוא כוח אדם'}
            </Button>
            <Button type="button" onClick={() => navigate('/users/new')}>
              יצירת כוח אדם
            </Button>
          </div>
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleImportFileChange}
      />

      <ContentContainer className="space-y-5 pb-10">
        {importError ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {importError}
          </div>
        ) : null}

        {deactivateError ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {deactivateError}
          </div>
        ) : null}

        {importResult ? (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <div className="font-medium">
              ייבוא הושלם: {importResult.created} נוספו, {importResult.failed} נכשלו.
            </div>
            {importResult.failed > 0 && importResult.errors.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {importResult.errors.map((error) => (
                  <li key={`${error.row}-${error.reason}`}>
                    שורה {error.row}: {error.reason}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {usersQuery.isPending ? (
          <LoadingState title="טוען כוח אדם" description="רשימת אנשי החברה נטענת כעת." />
        ) : usersQuery.isError ? (
          <ErrorState
            title="טעינת כוח אדם נכשלה"
            description="לא הצלחנו לטעון את רשימת אנשי החברה. אפשר לנסות שוב."
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
                    <TableHead className="w-36">פעולות</TableHead>
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
                        <TableCell className="space-x-2">
                          <Button type="button" variant="secondary" size="sm" onClick={() => navigate(`/users/${user.id}/edit`)}>
                            עריכה
                          </Button>
                          {confirmDeactivateId === user.id ? (
                            <div className="inline-flex items-center gap-2 align-middle">
                              <span className="text-xs text-muted">האם להפסיק את פעילותו?</span>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => void onDeactivate(user.id)}
                                disabled={pendingDeactivateId === user.id || deactivateInFlight}
                              >
                                {pendingDeactivateId === user.id ? 'מפסיק...' : 'אישור הפסקה'}
                              </Button>
                              <Button type="button" variant="secondary" size="sm" onClick={() => setConfirmDeactivateId(null)}>
                                ביטול
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => setConfirmDeactivateId(user.id)}
                              disabled={deactivateInFlight}
                            >
                              הפסק פעילות
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted">
                        אין אנשי צוות להצגה
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
              <div className="text-sm text-muted">
                {users.length > 0 ? `עמוד ${safePage} מתוך ${totalPages}` : 'לא נמצאו אנשי צוות'}
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
