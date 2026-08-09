import { create } from 'zustand'

type ShellState = {
  isMobileNavOpen: boolean
  setMobileNavOpen: (isOpen: boolean) => void
}

export const useShellStore = create<ShellState>((set) => ({
  isMobileNavOpen: false,
  setMobileNavOpen: (isOpen) => {
    set({ isMobileNavOpen: isOpen })
  },
}))