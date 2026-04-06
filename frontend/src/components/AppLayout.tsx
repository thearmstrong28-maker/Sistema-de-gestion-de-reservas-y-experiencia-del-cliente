import { NavLink, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

const tabs = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/reservas', label: 'Reservas' },
  { to: '/clientes', label: 'Clientes' },
  { to: '/mesas', label: 'Mesas/Disponibilidad' },
  { to: '/waitlist', label: 'Lista de espera' },
  { to: '/reportes', label: 'Reportes' },
] as const

export function AppLayout() {
  const token = useAuthStore((state) => state.token)
  const setToken = useAuthStore((state) => state.setToken)
  const clearToken = useAuthStore((state) => state.clearToken)

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Sistema de reservas</p>
          <h1>Operación diaria</h1>
        </div>

        <div className="token-field">
          <label htmlFor="jwt-token">JWT global</label>
          <div className="token-row">
            <input
              id="jwt-token"
              name="jwt-token"
              type="text"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Pegá el token Bearer aquí"
              autoComplete="off"
              spellCheck={false}
            />
            <button type="button" className="button button-ghost" onClick={clearToken}>
              Limpiar
            </button>
          </div>
        </div>
      </header>

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

      <main className="content-shell">
        <Outlet />
      </main>
    </div>
  )
}
