export interface AuthUser {
  id: string
  companyId: string
  email: string | null
  firstName: string
  lastName: string
}

export interface AuthPermission {
  key: string
  description: string | null
}

export interface AuthMeResponse {
  authenticated: true
  user: AuthUser
  permissions: AuthPermission[]
}

export type AuthSessionState =
  | {
      status: 'authenticated'
      user: AuthUser
      permissions: AuthPermission[]
    }
  | {
      status: 'unauthenticated'
      user: null
      permissions: []
    }
