import { create } from 'zustand'
import type { AuthProfile } from '../api/types'

const storageKey = 'restaurant-jwt'

const readStoredToken = (): string => {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.localStorage.getItem(storageKey) ?? ''
}

interface AuthState {
  token: string
  profile: AuthProfile | null
  status: 'idle' | 'loading' | 'ready'
  setToken: (token: string) => void
  setProfile: (profile: AuthProfile | null) => void
  setStatus: (status: AuthState['status']) => void
  setSession: (token: string, profile: AuthProfile | null) => void
  clearSession: () => void
}

const initialToken = readStoredToken()

export const useAuthStore = create<AuthState>((set) => ({
  token: initialToken,
  profile: null,
  status: initialToken ? 'idle' : 'ready',
  setToken: (token) => {
    if (typeof window !== 'undefined') {
      if (token.trim()) {
        window.localStorage.setItem(storageKey, token.trim())
      } else {
        window.localStorage.removeItem(storageKey)
      }
    }

    set({
      token: token.trim(),
      profile: null,
      status: token.trim() ? 'idle' : 'ready',
    })
  },
  setProfile: (profile) => {
    set({ profile })
  },
  setStatus: (status) => {
    set({ status })
  },
  setSession: (token, profile) => {
    const trimmedToken = token.trim()

    if (typeof window !== 'undefined') {
      if (trimmedToken) {
        window.localStorage.setItem(storageKey, trimmedToken)
      } else {
        window.localStorage.removeItem(storageKey)
      }
    }

    set({
      token: trimmedToken,
      profile,
      status: 'ready',
    })
  },
  clearSession: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey)
    }

    set({ token: '', profile: null, status: 'ready' })
  },
}))
