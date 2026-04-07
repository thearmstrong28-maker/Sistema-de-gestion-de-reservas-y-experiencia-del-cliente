import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { formatUserRole } from '../lib/labels'

const tabs = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/login', label: 'Iniciar sesión' },
  { to: '/registro', label: 'Registro' },
  { to: '/admin', label: 'Administración' },
] as const

export function AppLayout() {
  const location = useLocation()
  const isRegisterPage = location.pathname === '/registro'
  const isLoginPage = location.pathname === '/login'
  const token = useAuthStore((state) => state.token)
  const profile = useAuthStore((state) => state.profile)
  const clearSession = useAuthStore((state) => state.clearSession)

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          {isRegisterPage || isLoginPage ? null : <p className="eyebrow">Sistema de reservas</p>}
          <h1>{isRegisterPage ? 'Registro' : isLoginPage ? 'Inicio de sesión' : 'Inicio'}</h1>
          {isRegisterPage || isLoginPage ? null : (
            <p className="lead">Gestioná tus reservas y la experiencia de tus clientes.</p>
          )}
        </div>

        <div className="session-actions">
          {isRegisterPage || isLoginPage ? (
            <Link className="button button-ghost" to="/">
              Inicio
            </Link>
          ) : (
            <>
              {profile ? (
                <div className="session-card">
                  <span>{profile.fullName}</span>
                  <small>{formatUserRole(profile.role)}</small>
                </div>
              ) : null}
              {token ? (
                <button type="button" className="button button-ghost" onClick={clearSession}>
                  Cerrar sesión
                </button>
              ) : null}
            </>
          )}
        </div>
      </header>

      {location.pathname === '/' || isRegisterPage || isLoginPage ? null : (
        <nav className="tabbar" aria-label="Secciones principales">
          {tabs.map((tab) => (
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
