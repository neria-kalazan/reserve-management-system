import { describe, expect, it, vi } from 'vitest'

const { getMock, postMock, baseUrl } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  baseUrl: 'http://127.0.0.1:3000',
}))

vi.mock('@/api/client', () => ({
  api: {
    get: getMock,
    post: postMock,
    instance: {
      defaults: {
        baseURL: baseUrl,
      },
    },
  },
}))

import { getAuthMe, getGoogleAuthStartUrl, postAuthLogout } from '@/api/auth'

describe('getAuthMe', () => {
  it('calls GET /auth/me and returns response payload', async () => {
    const response = {
      authenticated: true,
      user: {
        id: 'user-1',
        companyId: 'company-1',
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User',
      },
      permissions: [{ key: 'view.dashboard', description: 'View dashboard' }],
    }

    getMock.mockResolvedValueOnce(response)

    await expect(getAuthMe()).resolves.toEqual(response)
    expect(getMock).toHaveBeenCalledWith('/auth/me')
  })

  it('builds Google auth start URL from the backend base URL', () => {
    expect(getGoogleAuthStartUrl()).toBe('http://127.0.0.1:3000/auth/google')
  })

  it('calls POST /auth/logout', async () => {
    postMock.mockResolvedValueOnce(undefined)

    await expect(postAuthLogout()).resolves.toBeUndefined()
    expect(postMock).toHaveBeenCalledWith('/auth/logout')
  })
})
