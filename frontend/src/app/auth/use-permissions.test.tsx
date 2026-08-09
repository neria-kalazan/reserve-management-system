import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { usePermissions } from '@/app/auth/use-permissions'
import { useAuthSession } from '@/app/auth/use-auth-session'

vi.mock('@/app/auth/use-auth-session', () => ({
  useAuthSession: vi.fn(),
}))

const useAuthSessionMock = vi.mocked(useAuthSession)

describe('usePermissions', () => {
  it('returns true when the authenticated user has the requested permission', () => {
    useAuthSessionMock.mockReturnValue({
      isInitializing: false,
      isAuthenticated: true,
      permissions: [{ key: 'MANAGE_COMPANIES', description: 'Manage companies' }],
      user: { id: 'user-1', email: 'user@example.com', firstName: 'First', lastName: 'Last' },
    } as unknown as ReturnType<typeof useAuthSession>)

    const { result } = renderHook(() => usePermissions())

    expect(result.current.hasPermission('MANAGE_COMPANIES')).toBe(true)
  })

  it('returns false when the authenticated user does not have the requested permission', () => {
    useAuthSessionMock.mockReturnValue({
      isInitializing: false,
      isAuthenticated: true,
      permissions: [{ key: 'VIEW_SYSTEM_REPORTS', description: 'View reports' }],
      user: { id: 'user-1', email: 'user@example.com', firstName: 'First', lastName: 'Last' },
    } as unknown as ReturnType<typeof useAuthSession>)

    const { result } = renderHook(() => usePermissions())

    expect(result.current.hasPermission('MANAGE_COMPANIES')).toBe(false)
  })

  it('supports querying multiple permissions independently', () => {
    useAuthSessionMock.mockReturnValue({
      isInitializing: false,
      isAuthenticated: true,
      permissions: [
        { key: 'MANAGE_COMPANIES', description: 'Manage companies' },
        { key: 'VIEW_SYSTEM_REPORTS', description: 'View reports' },
      ],
      user: { id: 'user-1', email: 'user@example.com', firstName: 'First', lastName: 'Last' },
    } as unknown as ReturnType<typeof useAuthSession>)

    const { result } = renderHook(() => usePermissions())

    expect(result.current.hasPermission('MANAGE_COMPANIES')).toBe(true)
    expect(result.current.hasPermission('VIEW_SYSTEM_REPORTS')).toBe(true)
    expect(result.current.hasPermission('MANAGE_SYSTEM_USERS')).toBe(false)
  })

  it('returns false for unauthenticated users', () => {
    useAuthSessionMock.mockReturnValue({
      isInitializing: false,
      isAuthenticated: false,
      permissions: [],
      user: null,
    } as unknown as ReturnType<typeof useAuthSession>)

    const { result } = renderHook(() => usePermissions())

    expect(result.current.hasPermission('MANAGE_COMPANIES')).toBe(false)
  })

  it('does not assume permissions while authentication is still initializing', () => {
    useAuthSessionMock.mockReturnValue({
      isInitializing: true,
      isAuthenticated: false,
      permissions: [],
      user: null,
    } as unknown as ReturnType<typeof useAuthSession>)

    const { result } = renderHook(() => usePermissions())

    expect(result.current.hasPermission('MANAGE_COMPANIES')).toBe(false)
  })
})
