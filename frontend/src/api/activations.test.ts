import { describe, expect, it, vi } from 'vitest'

const { postMock, baseUrl } = vi.hoisted(() => ({
  postMock: vi.fn(),
  baseUrl: 'http://127.0.0.1:3000',
}))

vi.mock('@/api/client', () => ({
  api: {
    post: postMock,
    instance: {
      defaults: {
        baseURL: baseUrl,
      },
    },
  },
}))

import { getActivationGoogleLinkStartUrl, postVerifyActivationPhone } from '@/api/activations'

describe('activation api', () => {
  it('calls POST /activations/:token/verify-phone with phone payload', async () => {
    const response = { verified: true, activationId: 'activation-1' }
    postMock.mockResolvedValueOnce(response)

    await expect(postVerifyActivationPhone('token-1', '0547724987')).resolves.toEqual(response)
    expect(postMock).toHaveBeenCalledWith('/activations/token-1/verify-phone', { phone: '0547724987' })
  })

  it('builds Google linking URL for activation flow from backend base URL', () => {
    expect(getActivationGoogleLinkStartUrl('token-1')).toBe('http://127.0.0.1:3000/activations/token-1/link-google')
  })
})
