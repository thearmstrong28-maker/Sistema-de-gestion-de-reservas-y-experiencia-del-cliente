import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { formatUserRole } from '../lib/labels'

export function AppLayout() {
  const location = useLocation()
  const isRegisterPage = location.pathname === '/registro'
  const isLoginPage = location.pathname === '/login'
  const isAdminPage =
    location.pathname === '/administracion' ||
    location.pathname === '/establecimiento' ||
    location.pathname === '/admin'
  const token = useAuthStore((state) => state.token)
  const profile = useAuthStore((state) => state.profile)
  const clearSession = useAuthStore((state) => state.clearSession)
  const isAdmin = profile?.role === 'admin'
  const restaurantName = profile?.restaurantName?.trim() || 'Restaurante principal'
  const adminTabLabel = `Administración del ${restaurantName}`
  const tabs = [
    { to: '/', label: 'Inicio', end: true },
    { to: '/login', label: 'Iniciar sesión' },
    { to: '/registro', label: 'Registro' },
    { to: '/administracion', label: adminTabLabel },
  ] as const
  const pageTitle = isRegisterPage
    ? 'Registro'
    : isLoginPage
      ? 'Inicio de sesión'
      : isAdminPage
        ? adminTabLabel
        : 'Inicio'

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          {isRegisterPage || isLoginPage ? null : <p className="eyebrow">Sistema de reservas</p>}
          <h1>{pageTitle}</h1>
          {isRegisterPage || isLoginPage ? null : (
            <p className="lead">Gestioná tus reservas y la experiencia de tus clientes.</p>
          )}
        </div>

        <div className="session-actions">
          {isRegisterPage || isLoginPage ? (
            <Link className="button button-ghost" to="/">
              Inicio
            </Link>
          ) : isAdminPage ? (
            <>
              {profile ? (
                <div className="session-card">
                  <span>{restaurantName}</span>
                  <small>{formatUserRole(profile.role)}</small>
                </div>
              ) : null}
              {token ? (
                <button type="button" className="button button-ghost" onClick={clearSession}>
                  Cerrar sesión
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      </header>

      {location.pathname === '/' || isRegisterPage || isLoginPage ? null : (
        <nav className="tabbar" aria-label="Secciones principales">
          {tabs
            .filter((tab) => tab.to !== '/administracion' || isAdmin)
            .map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) => (isActive ? 'tab tab-active' : 'tab')}
              >
                {tab.label}
              </NavLink>
            ))}
        </nav>
      )}

      <main className="content-shell">
        <Outlet />
      </main>
    </div>
  )
}
