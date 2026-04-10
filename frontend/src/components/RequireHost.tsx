import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

export function RequireHost() {
  const location = useLocation()
  const token = useAuthStore((state) => state.token)
  const profile = useAuthStore((state) => state.profile)
  const status = useAuthStore((state) => state.status)

  if (!token) {
    return <Navigate to="/login-recepcionista" replace state={{ from: location.pathname }} />
  }

  if (status === 'idle' || status === 'loading' || !profile) {
    return (
      <section className="panel center-panel">
        <p className="status status-loading">Cargando sesión...</p>
      </section>
    )
  }

  if (profile.role !== 'host') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
