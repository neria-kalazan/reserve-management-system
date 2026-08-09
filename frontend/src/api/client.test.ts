import { describe, expect, it } from 'vitest'

import { api } from '@/api/client'

describe('api client', () => {
  it('is configured to send credentials for cookie-based auth', () => {
    expect(api.instance.defaults.withCredentials).toBe(true)
  })
})
