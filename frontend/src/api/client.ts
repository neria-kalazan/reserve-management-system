import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios'

export interface ApiErrorPayload {
  message?: string | string[]
  error?: string
  statusCode?: number
}

export interface ApiError {
  status: number
  message: string
  payload?: ApiErrorPayload
}

type AuthStatusHandler = (error: ApiError) => void

const authHandlers: Partial<Record<401 | 403, AuthStatusHandler>> = {}

const toApiError = (error: AxiosError<ApiErrorPayload>): ApiError => {
  const payload = error.response?.data
  const message = Array.isArray(payload?.message)
    ? payload.message.join(', ')
    : payload?.message ?? error.message

  return {
    status: error.response?.status ?? 0,
    message,
    ...(payload ? { payload } : {}),
  }
}

export const registerAuthStatusHandler = (
  status: 401 | 403,
  handler: AuthStatusHandler,
) => {
  authHandlers[status] = handler
}

export const clearAuthStatusHandler = (status: 401 | 403) => {
  delete authHandlers[status]
}

const apiBaseUrl = import.meta.env.VITE_API_URL?.trim()

if (!apiBaseUrl) {
  throw new Error(
    'Missing required environment variable: VITE_API_URL. Define it in your frontend environment (for example, frontend/.env).',
  )
}

const axiosClient: AxiosInstance = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

axiosClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorPayload>) => {
    const apiError = toApiError(error)

    if (apiError.status === 401 || apiError.status === 403) {
      authHandlers[apiError.status]?.(apiError)
    }

    return Promise.reject(apiError)
  },
)

const extractData = <T>(response: AxiosResponse<T>) => response.data

export const api = {
  instance: axiosClient,
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    axiosClient.get<T>(url, config).then(extractData),
  post: <TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig,
  ) => axiosClient.post<TResponse>(url, body, config).then(extractData),
  put: <TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig,
  ) => axiosClient.put<TResponse>(url, body, config).then(extractData),
  patch: <TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig,
  ) => axiosClient.patch<TResponse>(url, body, config).then(extractData),
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    axiosClient.delete<T>(url, config).then(extractData),
}