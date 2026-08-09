import { QueryCache, QueryClient } from '@tanstack/react-query'

const defaultErrorMessage = 'אירעה שגיאה כללית בטעינת הנתונים.'

const toMessage = (error: unknown) => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.length > 0) {
      return message
    }
  }

  return defaultErrorMessage
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
    mutations: {
      retry: 0,
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      console.error(toMessage(error))
    },
  }),
})