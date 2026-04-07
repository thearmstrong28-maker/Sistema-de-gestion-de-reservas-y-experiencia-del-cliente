import { useEffect } from 'react'
import { fetchMe } from '../api/auth'
import { useAuthStore } from '../store/auth'

export function SessionBootstrap() {
  const token = useAuthStore((state) => state.token)
  const setProfile = useAuthStore((state) => state.setProfile)
  const setStatus = useAuthStore((state) => state.setStatus)
  const clearSession = useAuthStore((state) => state.clearSession)

  useEffect(() => {
    let isActive = true

    const loadProfile = async () => {
      if (!token) {
        setProfile(null)
        setStatus('ready')
        return
      }

      setStatus('loading')

      try {
        const currentProfile = await fetchMe()

        if (!isActive) {
          return
        }

        setProfile(currentProfile)
        setStatus('ready')
      } catch {
        if (!isActive) {
          return
        }

        clearSession()
      }
    }

    void loadProfile()

    return () => {
      isActive = false
    }
  }, [clearSession, setProfile, setStatus, token])

  return null
}
