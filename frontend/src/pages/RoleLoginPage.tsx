import { useState, type FormEvent } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { fetchMe, login, loginManager, loginReceptionist } from '../api/auth'
import { getApiErrorMessage } from '../api/http'
import { StatusMessage } from '../components/StatusMessage'
import { useAuthStore } from '../store/auth'

type LoginRole = 'host' | 'manager' | 'admin'
type Status = 'idle' | 'loading' | 'success' | 'error'

type LoginFormState = {
  email: string
  fullName: string
  password: string
}

type RoleLoginConfig = {
  role: LoginRole
  tabLabel: string
  title: string
  description: string
  submitLabel: string
  route: string
  expectedRole: 'host' | 'manager' | 'admin'
  authMode: 'standard' | 'manager' | 'receptionist'
}

type RoleLoginFormProps = {
  activeRole: LoginRole
}

const roleLoginConfigs: Record<LoginRole, RoleLoginConfig> = {
  host: {
    role: 'host',
    tabLabel: 'Recepcionista',
    title: 'Acceso Recepcionista',
    description:
      'Ingresá con tu nombre registrado y contraseña para entrar al panel de recepciónista',
    submitLabel: 'Ingresar como recepcionista',
    route: '/login-recepcionista',
    expectedRole: 'host',
    authMode: 'receptionist',
  },
  manager: {
    role: 'manager',
    tabLabel: 'Gerente',
    title: 'Acceso Gerente',
    description: 'Ingresá con tu nombre registrado y contraseña para entrar al panel gerencial.',
    submitLabel: 'Ingresar como gerente',
    route: '/login-gerente',
    expectedRole: 'manager',
    authMode: 'manager',
  },
  admin: {
    role: 'admin',
    tabLabel: 'Administrador',
    title: 'Acceso Administrador',
    description: 'Ingresá con tu correo y contraseña para acceder a la administración del restaurante.',
    submitLabel: 'Ingresar como administrador',
    route: '/login',
    expectedRole: 'admin',
    authMode: 'standard',
  },
}

const roleOrder: LoginRole[] = ['host', 'manager', 'admin']

const emptyForm: LoginFormState = {
  email: '',
  fullName: '',
  password: '',
}

const getRoleFromPath = (pathname: string): LoginRole => {
  switch (pathname) {
    case '/login-gerente':
      return 'manager'
    case '/login-recepcionista':
      return 'host'
    default:
      return 'admin'
  }
}

function RoleLoginForm({ activeRole }: RoleLoginFormProps) {
  const navigate = useNavigate()
  const setToken = useAuthStore((state) => state.setToken)
  const setProfile = useAuthStore((state) => state.setProfile)
  const setStatus = useAuthStore((state) => state.setStatus)
  const clearSession = useAuthStore((state) => state.clearSession)
  const [form, setForm] = useState<LoginFormState>(emptyForm)
  const [authState, setAuthState] = useState<{ status: Status; message: string }>({
    status: 'idle',
    message: '',
  })
  const activeConfig = roleLoginConfigs[activeRole]

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthState({ status: 'loading', message: 'Validando credenciales...' })

    try {
      if (activeConfig.authMode === 'receptionist') {
        const { accessToken, profile } = await loginReceptionist({
          identifier: form.email.trim(),
          password: form.password,
        })

        setToken(accessToken)

        if (profile.role !== activeConfig.expectedRole) {
          clearSession()
          setAuthState({
            status: 'error',
            message: 'Esta cuenta no tiene acceso de recepcionista.',
          })
          return
        }

        setProfile(profile)
        setStatus('ready')
        setAuthState({ status: 'success', message: 'Ingreso correcto.' })
        navigate('/recepcionista', { replace: true })
        return
      }

      if (activeConfig.authMode === 'manager') {
        const { accessToken } = await loginManager({
          fullName: form.fullName.trim(),
          password: form.password,
        })

        setToken(accessToken)
        const currentProfile = await fetchMe()

        if (currentProfile.role !== activeConfig.expectedRole) {
          clearSession()
          setAuthState({
            status: 'error',
            message: 'Esta cuenta no tiene acceso de gerente.',
          })
          return
        }

        setProfile(currentProfile)
        setStatus('ready')
        setAuthState({ status: 'success', message: 'Ingreso correcto.' })
        navigate('/gerente', { replace: true })
        return
      }

      const { accessToken } = await login({
        email: form.email.trim(),
        password: form.password,
      })

      setToken(accessToken)
      const currentProfile = await fetchMe()

      if (currentProfile.role !== activeConfig.expectedRole) {
        clearSession()
        setAuthState({
          status: 'error',
          message:
            activeConfig.expectedRole === 'admin'
              ? 'Esta cuenta no tiene acceso de administrador.'
              : 'Esta cuenta no tiene acceso de recepcionista.',
        })
        return
      }

      setProfile(currentProfile)
      setStatus('ready')
      setAuthState({ status: 'success', message: 'Ingreso correcto.' })
      navigate(activeConfig.expectedRole === 'admin' ? '/administracion' : '/recepcionista', {
        replace: true,
      })
    } catch (error) {
      clearSession()
      setAuthState({ status: 'error', message: getApiErrorMessage(error) })
    }
  }

  return (
    <article className="auth-card panel auth-role-card fade-in">
      <div className="auth-intro">
        <p className="eyebrow">Acceso por puesto</p>
        <h2>{activeConfig.title}</h2>
        <p className="muted">{activeConfig.description}</p>
      </div>

      <form className="form-panel auth-form" onSubmit={handleSubmit} noValidate>
        {activeConfig.authMode === 'manager' ? (
          <label>
            Nombre registrado
            <input
              type="text"
              value={form.fullName}
              onChange={(event) => setForm({ ...form, fullName: event.target.value })}
              autoComplete="name"
              required
            />
          </label>
        ) : (
          <label>
            {activeConfig.authMode === 'receptionist'
              ? 'Nombre registrado'
              : 'Correo electrónico'}
            <input
              type={activeConfig.authMode === 'receptionist' ? 'text' : 'email'}
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              autoComplete={activeConfig.authMode === 'receptionist' ? 'username' : 'email'}
              required
            />
          </label>
        )}

        <label>
          Contraseña
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            autoComplete="current-password"
            required
          />
        </label>

        <button type="submit" className="button button-primary">
          {activeConfig.submitLabel}
        </button>

        <StatusMessage status={authState.status} message={authState.message} />

        <div className="auth-links">
          {activeConfig.role === 'admin' ? (
            <NavLink className="button button-secondary" to="/registro">
              Crear administración
            </NavLink>
          ) : (
            <NavLink className="button button-secondary" to="/">
              Volver al inicio
            </NavLink>
          )}
        </div>
      </form>
    </article>
  )
}

export function RoleLoginPage() {
  const { pathname } = useLocation()
  const activeRole = getRoleFromPath(pathname)

  return (
    <section className="auth-shell page-stack">
      <nav className="tabbar auth-role-tabs" aria-label="Seleccioná tu puesto">
        {roleOrder.map((role) => {
          const config = roleLoginConfigs[role]

          return (
            <NavLink
              key={config.role}
              className={({ isActive }) => (isActive ? 'tab tab-active' : 'tab')}
              end
              to={config.route}
            >
              {config.tabLabel}
            </NavLink>
          )
        })}
      </nav>

      <RoleLoginForm key={activeRole} activeRole={activeRole} />
    </section>
  )
}
