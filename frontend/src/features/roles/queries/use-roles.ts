import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuthSession } from '@/app/auth/use-auth-session'
import { deleteRole, getCompanyRoles, getRoleById, patchRole, postCompanyRole } from '@/features/roles/api/roles'
import type { CompanyRole, CreateRoleInput, UpdateRoleInput } from '@/features/roles/api/roles'

export const companyRolesQueryKey = (companyId: string | undefined) =>
  ['companies', companyId, 'roles'] as const

export const roleDetailQueryKey = (roleId: string | undefined) =>
  ['roles', roleId] as const

export function useCompanyRoles(companyId: string | undefined) {
  const { isAuthenticated } = useAuthSession()

  return useQuery<CompanyRole[]>({
    queryKey: companyRolesQueryKey(companyId),
    queryFn: () => getCompanyRoles(companyId as string),
    enabled: isAuthenticated && typeof companyId === 'string' && companyId.length > 0,
  })
}

export function useRoleById(roleId: string | undefined) {
  const { isAuthenticated } = useAuthSession()

  return useQuery<CompanyRole>({
    queryKey: roleDetailQueryKey(roleId),
    queryFn: () => getRoleById(roleId as string),
    enabled: isAuthenticated && typeof roleId === 'string' && roleId.length > 0,
  })
}

export function useCreateRole() {
  const queryClient = useQueryClient()
  const { user } = useAuthSession()
  const companyId = user?.companyId

  return useMutation({
    mutationFn: (body: CreateRoleInput) => {
      if (typeof companyId !== 'string' || companyId.length === 0) {
        throw new Error('Cannot create a role without an authenticated company context.')
      }

      return postCompanyRole(companyId, body)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: companyRolesQueryKey(companyId) })
    },
  })
}

export interface UpdateRoleMutationInput {
  roleId: string
  body: UpdateRoleInput
}

export function useUpdateRole() {
  const queryClient = useQueryClient()
  const { user } = useAuthSession()
  const companyId = user?.companyId

  return useMutation({
    mutationFn: ({ roleId, body }: UpdateRoleMutationInput) => patchRole(roleId, body),
    onSuccess: async (_updatedRole: CompanyRole, variables: UpdateRoleMutationInput) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: companyRolesQueryKey(companyId) }),
        queryClient.invalidateQueries({ queryKey: roleDetailQueryKey(variables.roleId) }),
      ])
    },
  })
}

export function useDeleteRole() {
  const queryClient = useQueryClient()
  const { user } = useAuthSession()
  const companyId = user?.companyId

  return useMutation({
    mutationFn: (roleId: string) => deleteRole(roleId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: companyRolesQueryKey(companyId) })
    },
  })
}
