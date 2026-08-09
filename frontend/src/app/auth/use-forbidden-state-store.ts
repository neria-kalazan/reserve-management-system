import { create } from 'zustand'

type ForbiddenState = {
  isForbidden: boolean
  message: string | undefined
  setForbidden: (message?: string) => void
  clearForbidden: () => void
}

export const useForbiddenStateStore = create<ForbiddenState>((set) => ({
  isForbidden: false,
  message: undefined,
  setForbidden: (message) => {
    set({ isForbidden: true, message })
  },
  clearForbidden: () => {
    set({ isForbidden: false, message: undefined })
  },
}))
