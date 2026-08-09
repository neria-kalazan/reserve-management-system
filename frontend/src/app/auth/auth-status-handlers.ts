import { clearAuthStatusHandler, registerAuthStatusHandler } from '@/api/client'

type AuthStatusHandlerArgs = {
  setUnauthenticated: () => void
  setForbidden: (message?: string) => void
}

export const attachAuthStatusHandlers = ({ setUnauthenticated, setForbidden }: AuthStatusHandlerArgs) => {
  registerAuthStatusHandler(401, () => {
    setUnauthenticated()
  })

  registerAuthStatusHandler(403, (error) => {
    setForbidden(error.message)
  })

  return () => {
    clearAuthStatusHandler(401)
    clearAuthStatusHandler(403)
  }
}
