import { create } from 'zustand'

const storageKey = 'restaurant-jwt'

const readStoredToken = (): string => {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.localStorage.getItem(storageKey) ?? ''
}

interface AuthState {
  token: string
  setToken: (token: string) => void
  clearToken: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: readStoredToken(),
  setToken: (token) => {
    if (typeof window !== 'undefined') {
      if (token.trim()) {
        window.localStorage.setItem(storageKey, token.trim())
      } else {
        window.localStorage.removeItem(storageKey)
      }
    }

    set({ token })
  },
  clearToken: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey)
    }

    set({ token: '' })
  },
}))
