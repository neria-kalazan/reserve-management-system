import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const { usePermissionsMock } = vi.hoisted(() => ({
  usePermissionsMock: vi.fn(),
}))

vi.mock('@/app/auth/use-permissions', () => ({
  usePermissions: usePermissionsMock,
}))

import { PermissionGate } from '@/app/auth/permission-gate'

describe('PermissionGate', () => {
  it('renders children when the user has permission', () => {
    usePermissionsMock.mockReturnValue({
      hasPermission: () => true,
    })

    render(
      <PermissionGate permission="MANAGE_COMPANIES">
        <button type="button">פעולה מוגנת</button>
      </PermissionGate>,
    )

    expect(screen.getByRole('button', { name: 'פעולה מוגנת' })).toBeDefined()
  })

  it('hides children when the user lacks permission', () => {
    usePermissionsMock.mockReturnValue({
      hasPermission: () => false,
    })

    render(
      <PermissionGate permission="MANAGE_COMPANIES">
        <button type="button">פעולה מוגנת</button>
      </PermissionGate>,
    )

    expect(screen.queryByRole('button', { name: 'פעולה מוגנת' })).toBeNull()
  })
})
