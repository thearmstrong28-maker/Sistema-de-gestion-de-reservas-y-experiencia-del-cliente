import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchMe, login } from '../api/auth'
import { getApiErrorMessage } from '../api/http'
import { StatusMessage } from '../components/StatusMessage'
import { useAuthStore } from '../store/auth'

type Status = 'idle' | 'loading' | 'success' | 'error'

const emptyForm = {
  email: '',
  password: '',
}

export function LoginPage() {
  const navigate = useNavigate()
  const token = useAuthStore((state) => state.token)
  const profile = useAuthStore((state) => state.profile)
  const status = useAuthStore((state) => state.status)
  const setToken = useAuthStore((state) => state.setToken)
  const setProfile = useAuthStore((state) => state.setProfile)
  const setStatus = useAuthStore((state) => state.setStatus)
  const clearSession = useAuthStore((state) => state.clearSession)
  const [form, setForm] = useState(emptyForm)
  const [authState, setAuthState] = useState<{ status: Status; message: string }>({
    status: 'idle',
    message: '',
  })
  const profileRole = profile?.role

  useEffect(() => {
    if (token && status === 'ready') {
      navigate(profileRole === 'admin' ? '/admin' : '/', { replace: true })
    }
  }, [navigate, profileRole, status, token])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthState({ status: 'loading', message: 'Validando credenciales...' })

    try {
      const { accessToken } = await login({
        email: form.email.trim(),
        password: form.password,
      })

      setToken(accessToken)
      const currentProfile = await fetchMe()

      setProfile(currentProfile)
      setStatus('ready')
      setAuthState({ status: 'success', message: 'Ingreso correcto.' })
      navigate(currentProfile.role === 'admin' ? '/admin' : '/', { replace: true })
    } catch (error) {
      clearSession()
      setAuthState({ status: 'error', message: getApiErrorMessage(error) })
    }
  }

  return (
    <section className="auth-shell">
      <article className="auth-card panel">
        <div>
          <h2>Iniciar sesión</h2>
          <p className="muted">
            Ingresá con la cuenta de tu restaurante para continuar.
          </p>
        </div>

        <form className="form-panel" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              autoComplete="email"
              required
            />
          </label>

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
            Iniciar sesión
          </button>

          <StatusMessage status={authState.status} message={authState.message} />

          <div className="auth-links">
            <Link className="button button-secondary" to="/registro">
              Crear una cuenta
            </Link>
          </div>
        </form>
      </article>
    </section>
  )
}
