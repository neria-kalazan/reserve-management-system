import { api } from '@/api/client'

export interface CompanyRole {
  id: string
  name: string
  description?: string | null
  createdAt?: string
}

export interface CompanyRolesPageResult {
  items: CompanyRole[]
  total: number
  page: number
  pageSize: number
}

export interface CreateRoleInput {
  name: string
  description?: string | null
}

export interface UpdateRoleInput {
  name?: string
  description?: string | null
}

export const getCompanyRoles = (
  companyId: string,
  params?: { page?: number; pageSize?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' },
) => api.get<CompanyRolesPageResult>(`/companies/${encodeURIComponent(companyId)}/roles`, { params })

export const getRoleById = (roleId: string) =>
  api.get<CompanyRole>(`/roles/${encodeURIComponent(roleId)}`)

export const postCompanyRole = (companyId: string, body: CreateRoleInput) =>
  api.post<CompanyRole>(`/companies/${encodeURIComponent(companyId)}/roles`, body)

export const patchRole = (roleId: string, body: UpdateRoleInput) =>
  api.patch<CompanyRole>(`/roles/${encodeURIComponent(roleId)}`, body)

export const deleteRole = (roleId: string) =>
  api.delete<CompanyRole>(`/roles/${encodeURIComponent(roleId)}`)
