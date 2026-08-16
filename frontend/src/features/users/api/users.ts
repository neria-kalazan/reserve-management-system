import { api } from '@/api/client'

export interface CompanyUnit {
  id: string
  name: string
  description?: string | null
  displayOrder: number
}

export interface CompanyRole {
  id: string
  name: string
  description?: string | null
}

export interface CompanyQualification {
  id: string
  name: string
  description?: string | null
}

export interface CompanyUser {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string | null
  personalNumber: string
  isActive: boolean
  createdAt?: string
  unit: CompanyUnit | null
  roles: CompanyRole[]
  qualifications: CompanyQualification[]
}

export interface CompanyUsersPageResult {
  items: CompanyUser[]
  total: number
  page: number
  pageSize: number
}

export interface CreateUserInput {
  firstName: string
  lastName: string
  phone: string
  email?: string | null
  personalNumber: string
  unitId: string
}

export interface UpdateUserInput {
  firstName?: string
  lastName?: string
  phone?: string
  email?: string | null
  unitId?: string
  isActive?: boolean
}

export interface UserImportRowError {
  row: number
  reason: string
}

export interface UserImportResult {
  created: number
  failed: number
  errors: UserImportRowError[]
}

export const getCompanyUsers = (companyId: string, params?: { page?: number; pageSize?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }) =>
  api.get<CompanyUsersPageResult>(`/companies/${encodeURIComponent(companyId)}/users`, { params })

export const importCompanyUsers = (companyId: string, file: File) => {
  const formData = new FormData()
  formData.append('file', file)

  return api.instance
    .post<UserImportResult>(`/companies/${encodeURIComponent(companyId)}/users/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    .then((response) => response.data)
}

export const getUserById = (userId: string) =>
  api.get<CompanyUser & { company: { id: string; name: string }; unit: CompanyUnit | null }>(`/users/${encodeURIComponent(userId)}`)

export const postCompanyUser = (companyId: string, body: CreateUserInput) =>
  api.post<CompanyUser>(`/companies/${encodeURIComponent(companyId)}/users`, body)

export const patchUser = (userId: string, body: UpdateUserInput) =>
  api.patch<CompanyUser>(`/users/${encodeURIComponent(userId)}`, body)

export const getUserRoles = (userId: string) =>
  api.get<CompanyRole[]>(`/users/${encodeURIComponent(userId)}/roles`)

export const assignUserRole = (userId: string, roleId: string) =>
  api.post<unknown>(`/users/${encodeURIComponent(userId)}/roles/${encodeURIComponent(roleId)}`)

export const removeUserRole = (userId: string, roleId: string) =>
  api.delete<unknown>(`/users/${encodeURIComponent(userId)}/roles/${encodeURIComponent(roleId)}`)

export const getUserQualifications = (userId: string) =>
  api.get<CompanyQualification[]>(`/users/${encodeURIComponent(userId)}/qualifications`)

export const assignUserQualification = (userId: string, qualificationId: string) =>
  api.post<unknown>(`/users/${encodeURIComponent(userId)}/qualifications/${encodeURIComponent(qualificationId)}`)

export const removeUserQualification = (userId: string, qualificationId: string) =>
  api.delete<unknown>(`/users/${encodeURIComponent(userId)}/qualifications/${encodeURIComponent(qualificationId)}`)
