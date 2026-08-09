import { api } from '@/api/client'
import type { AuthMeResponse } from '@/types/auth'

export const getAuthMe = () => api.get<AuthMeResponse>('/auth/me')

const toAuthEndpointUrl = (path: string) => {
	const baseUrl = api.instance.defaults.baseURL

	if (typeof baseUrl !== 'string' || baseUrl.trim().length === 0) {
		throw new Error('API base URL is not configured for authentication flow.')
	}

	const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`

	return new URL(path, normalizedBase).toString()
}

export const getGoogleAuthStartUrl = () => toAuthEndpointUrl('auth/google')

export const postAuthLogout = () => api.post<void>('/auth/logout')
