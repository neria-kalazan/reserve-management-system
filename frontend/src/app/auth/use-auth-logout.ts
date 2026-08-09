import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { postAuthLogout } from '@/api/auth'
import { authSessionQueryKey, unauthenticatedAuthSession } from '@/app/auth/use-auth-session'

export function useAuthLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: postAuthLogout,
    onSuccess: () => {
      queryClient.setQueryData(authSessionQueryKey, unauthenticatedAuthSession)
      navigate('/login', { replace: true })
    },
  })
}
