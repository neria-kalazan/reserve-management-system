export const env = {
  apiUrl: import.meta.env.VITE_API_URL,
} as const

export function hasConfiguredApiUrl() {
  return typeof env.apiUrl === 'string' && env.apiUrl.length > 0
}