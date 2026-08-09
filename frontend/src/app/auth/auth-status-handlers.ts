import { clearAuthStatusHandler, registerAuthStatusHandler } from '@/api/client'

export const attachAuthStatusHandlers = (setUnauthenticated: () => void) => {
  registerAuthStatusHandler(401, () => {
    setUnauthenticated()
  })

  return () => {
    clearAuthStatusHandler(401)
  }
}
