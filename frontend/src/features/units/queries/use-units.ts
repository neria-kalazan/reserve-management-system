import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuthSession } from '@/app/auth/use-auth-session'
import { deleteUnit, getCompanyUnits, getUnitById, patchUnit, postCompanyUnit } from '@/features/units/api/units'
import type { CompanyUnit, CreateUnitInput, UpdateUnitInput } from '@/features/units/api/units'

export const companyUnitsQueryKey = (companyId: string | undefined) =>
  ['companies', companyId, 'units'] as const

export const unitDetailQueryKey = (unitId: string | undefined) =>
  ['units', unitId] as const

export function useCompanyUnits(companyId: string | undefined) {
  const { isAuthenticated } = useAuthSession()

  return useQuery<CompanyUnit[]>({
    queryKey: companyUnitsQueryKey(companyId),
    queryFn: () => getCompanyUnits(companyId as string),
    enabled: isAuthenticated && typeof companyId === 'string' && companyId.length > 0,
  })
}

export function useUnitById(unitId: string | undefined) {
  const { isAuthenticated } = useAuthSession()

  return useQuery<CompanyUnit>({
    queryKey: unitDetailQueryKey(unitId),
    queryFn: () => getUnitById(unitId as string),
    enabled: isAuthenticated && typeof unitId === 'string' && unitId.length > 0,
  })
}

export function useCreateUnit() {
  const queryClient = useQueryClient()
  const { user } = useAuthSession()
  const companyId = user?.companyId

  return useMutation({
    mutationFn: (body: CreateUnitInput) => {
      if (typeof companyId !== 'string' || companyId.length === 0) {
        throw new Error('Cannot create a unit without an authenticated company context.')
      }

      return postCompanyUnit(companyId, body)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: companyUnitsQueryKey(companyId) })
    },
  })
}

export interface UpdateUnitMutationInput {
  unitId: string
  body: UpdateUnitInput
}

export function useUpdateUnit() {
  const queryClient = useQueryClient()
  const { user } = useAuthSession()
  const companyId = user?.companyId

  return useMutation({
    mutationFn: ({ unitId, body }: UpdateUnitMutationInput) => patchUnit(unitId, body),
    onSuccess: async (_updatedUnit: CompanyUnit, variables: UpdateUnitMutationInput) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: companyUnitsQueryKey(companyId) }),
        queryClient.invalidateQueries({ queryKey: unitDetailQueryKey(variables.unitId) }),
      ])
    },
  })
}

export function useDeleteUnit() {
  const queryClient = useQueryClient()
  const { user } = useAuthSession()
  const companyId = user?.companyId

  return useMutation({
    mutationFn: (unitId: string) => deleteUnit(unitId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: companyUnitsQueryKey(companyId) })
    },
  })
}
