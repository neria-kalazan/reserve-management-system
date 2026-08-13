import { api } from '@/api/client'

export interface VerifyActivationPhoneResponse {
  verified: boolean
  activationId: string
}

const toActivationEndpointUrl = (token: string, pathSuffix: string) => {
  const baseUrl = api.instance.defaults.baseURL

  if (typeof baseUrl !== 'string' || baseUrl.trim().length === 0) {
    throw new Error('API base URL is not configured for activation flow.')
  }

  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const encodedToken = encodeURIComponent(token)

  return new URL(`activations/${encodedToken}/${pathSuffix}`, normalizedBase).toString()
}

export const postVerifyActivationPhone = (token: string, phone: string) => {
  const encodedToken = encodeURIComponent(token)

  return api.post<VerifyActivationPhoneResponse, { phone: string }>(
    `/activations/${encodedToken}/verify-phone`,
    { phone },
  )
}

export const getActivationGoogleLinkStartUrl = (token: string) => {
  return toActivationEndpointUrl(token, 'link-google')
}
