import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuthSession } from '@/app/auth/use-auth-session'
import { deleteQualification, getCompanyQualifications, getQualificationById, patchQualification, postCompanyQualification } from '@/features/qualifications/api/qualifications'
import type { CompanyQualification, CreateQualificationInput, UpdateQualificationInput } from '@/features/qualifications/api/qualifications'

export const companyQualificationsQueryKey = (companyId: string | undefined) =>
  ['companies', companyId, 'qualifications'] as const

export const qualificationDetailQueryKey = (qualificationId: string | undefined) =>
  ['qualifications', qualificationId] as const

export function useCompanyQualifications(companyId: string | undefined) {
  const { isAuthenticated } = useAuthSession()

  return useQuery<CompanyQualification[]>({
    queryKey: companyQualificationsQueryKey(companyId),
    queryFn: () => getCompanyQualifications(companyId as string),
    enabled: isAuthenticated && typeof companyId === 'string' && companyId.length > 0,
  })
}

export function useQualificationById(qualificationId: string | undefined) {
  const { isAuthenticated } = useAuthSession()

  return useQuery<CompanyQualification>({
    queryKey: qualificationDetailQueryKey(qualificationId),
    queryFn: () => getQualificationById(qualificationId as string),
    enabled: isAuthenticated && typeof qualificationId === 'string' && qualificationId.length > 0,
  })
}

export function useCreateQualification() {
  const queryClient = useQueryClient()
  const { user } = useAuthSession()
  const companyId = user?.companyId

  return useMutation({
    mutationFn: (body: CreateQualificationInput) => {
      if (typeof companyId !== 'string' || companyId.length === 0) {
        throw new Error('Cannot create a qualification without an authenticated company context.')
      }

      return postCompanyQualification(companyId, body)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: companyQualificationsQueryKey(companyId) })
    },
  })
}

export interface UpdateQualificationMutationInput {
  qualificationId: string
  body: UpdateQualificationInput
}

export function useUpdateQualification() {
  const queryClient = useQueryClient()
  const { user } = useAuthSession()
  const companyId = user?.companyId

  return useMutation({
    mutationFn: ({ qualificationId, body }: UpdateQualificationMutationInput) => patchQualification(qualificationId, body),
    onSuccess: async (_updatedQualification: CompanyQualification, variables: UpdateQualificationMutationInput) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: companyQualificationsQueryKey(companyId) }),
        queryClient.invalidateQueries({ queryKey: qualificationDetailQueryKey(variables.qualificationId) }),
      ])
    },
  })
}

export function useDeleteQualification() {
  const queryClient = useQueryClient()
  const { user } = useAuthSession()
  const companyId = user?.companyId

  return useMutation({
    mutationFn: (qualificationId: string) => deleteQualification(qualificationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: companyQualificationsQueryKey(companyId) })
    },
  })
}
