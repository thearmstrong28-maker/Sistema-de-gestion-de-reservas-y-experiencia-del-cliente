import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { formatUserRole } from '../lib/labels'

export function AppLayout() {
  const location = useLocation()
  const isRegisterPage = location.pathname === '/registro'
  const isLoginPage = location.pathname.startsWith('/login')
  const isAdminPage =
    location.pathname === '/administracion' ||
    location.pathname === '/establecimiento' ||
    location.pathname === '/admin'
  const isManagerPage = location.pathname === '/gerente'
  const isReceptionistPage = location.pathname === '/recepcionista'
  const token = useAuthStore((state) => state.token)
  const profile = useAuthStore((state) => state.profile)
  const clearSession = useAuthStore((state) => state.clearSession)
  const isAdmin = profile?.role === 'admin'
  const isManager = profile?.role === 'manager'
  const restaurantName = profile?.restaurantName?.trim() || 'Restaurante principal'
  const adminTabLabel = 'Administrador'
  const tabs = [
    { to: '/', label: 'Inicio', end: true },
    { to: '/recepcionista', label: 'Recepcionista' },
    { to: '/gerente', label: 'Gerente' },
    { to: '/administracion', label: adminTabLabel },
  ] as const
  const pageTitle = isRegisterPage
    ? 'Registro'
    : isLoginPage
      ? location.pathname === '/login-gerente'
        ? 'Acceso de gerente'
        : location.pathname === '/login-recepcionista'
          ? 'Acceso de recepcionista'
          : 'Acceso de administrador'
      : isAdminPage
        ? adminTabLabel
        : isManagerPage
          ? 'Gerente'
          : isReceptionistPage
            ? 'Recepcionista'
            : 'Inicio'

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          {isRegisterPage || isLoginPage ? null : (
            <p className="eyebrow">Sistema de reservas</p>
          )}
          <h1>{pageTitle}</h1>
          {isRegisterPage || isLoginPage || isAdminPage ? null : (
            <p className="lead">Gestioná tus reservas y la experiencia de tus clientes.</p>
          )}
        </div>

        <div className="session-actions">
        {!isRegisterPage && !isLoginPage ? (
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
            .filter((tab) => (isAdminPage ? tab.to !== '/' : true))
            .filter((tab) => (tab.to === '/gerente' ? isManager : true))
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
