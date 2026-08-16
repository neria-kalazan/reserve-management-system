import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuthSession } from '@/app/auth/use-auth-session'
import {
  getCompanyUsers,
  getUserById,
  getUserQualifications,
  getUserRoles,
  importCompanyUsers,
  patchUser,
  postCompanyUser,
} from '@/features/users/api/users'
import type {
  CompanyQualification,
  CompanyRole,
  CompanyUser,
  CompanyUsersPageResult,
  CreateUserInput,
  UpdateUserInput,
} from '@/features/users/api/users'

export const companyUsersQueryKey = (companyId: string | undefined) =>
  ['companies', companyId, 'users'] as const

export const userDetailQueryKey = (userId: string | undefined) =>
  ['users', userId] as const

export const userRolesQueryKey = (userId: string | undefined) =>
  ['users', userId, 'roles'] as const

export const userQualificationsQueryKey = (userId: string | undefined) =>
  ['users', userId, 'qualifications'] as const

export function useCompanyUsers(
  companyId: string | undefined,
  params?: { page?: number; pageSize?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' },
) {
  const { isAuthenticated } = useAuthSession()

  return useQuery<CompanyUsersPageResult>({
    queryKey: [...companyUsersQueryKey(companyId), params ?? {}],
    queryFn: () => getCompanyUsers(companyId as string, params),
    enabled: isAuthenticated && typeof companyId === 'string' && companyId.length > 0,
    placeholderData: (previousData) => previousData as CompanyUsersPageResult | undefined,
  })
}

export function useUserById(userId: string | undefined) {
  const { isAuthenticated } = useAuthSession()

  return useQuery({
    queryKey: userDetailQueryKey(userId),
    queryFn: () => getUserById(userId as string),
    enabled: isAuthenticated && typeof userId === 'string' && userId.length > 0,
  })
}

export function useUserRoles(userId: string | undefined) {
  const { isAuthenticated } = useAuthSession()

  return useQuery<CompanyRole[]>({
    queryKey: userRolesQueryKey(userId),
    queryFn: () => getUserRoles(userId as string),
    enabled: isAuthenticated && typeof userId === 'string' && userId.length > 0,
  })
}

export function useUserQualifications(userId: string | undefined) {
  const { isAuthenticated } = useAuthSession()

  return useQuery<CompanyQualification[]>({
    queryKey: userQualificationsQueryKey(userId),
    queryFn: () => getUserQualifications(userId as string),
    enabled: isAuthenticated && typeof userId === 'string' && userId.length > 0,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  const { user } = useAuthSession()
  const companyId = user?.companyId

  return useMutation({
    mutationFn: (body: CreateUserInput) => {
      if (typeof companyId !== 'string' || companyId.length === 0) {
        throw new Error('Cannot create a user without an authenticated company context.')
      }

      return postCompanyUser(companyId, body)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: companyUsersQueryKey(companyId) })
    },
  })
}

export function useImportCompanyUsers() {
  const queryClient = useQueryClient()
  const { user } = useAuthSession()
  const companyId = user?.companyId

  return useMutation({
    mutationFn: async (file: File) => {
      if (typeof companyId !== 'string' || companyId.length === 0) {
        throw new Error('לא ניתן לייבא אנשי צוות ללא הקשר חברתתי מאומת.')
      }

      if (!(file instanceof File)) {
        throw new Error('לא נבחר קובץ.')
      }

      return importCompanyUsers(companyId, file)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: companyUsersQueryKey(companyId) })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  const { user } = useAuthSession()
  const companyId = user?.companyId

  return useMutation({
    mutationFn: ({ userId, body }: { userId: string; body: UpdateUserInput }) =>
      patchUser(userId, body),
    onSuccess: async (_updatedUser: CompanyUser, variables: { userId: string; body: UpdateUserInput }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: companyUsersQueryKey(companyId) }),
        queryClient.invalidateQueries({ queryKey: userDetailQueryKey(variables.userId) }),
      ])
    },
  })
}

export function useDeactivateUser() {
  const queryClient = useQueryClient()
  const { user } = useAuthSession()
  const companyId = user?.companyId

  return useMutation({
    mutationFn: (userId: string) => patchUser(userId, { isActive: false }),
    onSuccess: async (_updatedUser: CompanyUser, userId: string) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: companyUsersQueryKey(companyId) }),
        queryClient.invalidateQueries({ queryKey: userDetailQueryKey(userId) }),
      ])
    },
  })
}
