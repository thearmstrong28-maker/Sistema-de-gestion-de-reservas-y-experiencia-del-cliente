import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { createInternalUser, deleteUser, listUsers } from '../api/admin'
import { getApiErrorMessage } from '../api/http'
import type {
  AdminUser,
  CreateInternalUserRequest,
  DailyOccupancyRow,
  DailyOccupancyQuery,
  FrequentCustomerRow,
  FrequentCustomersQuery,
  InternalUserRole,
  ListUsersQuery,
} from '../api/types'
import { StatusMessage } from '../components/StatusMessage'
import { formatDate, formatDateTime, formatPercent } from '../lib/format'
import { formatUserRole } from '../lib/labels'
import { omitEmptyString } from '../lib/forms'
import { api } from '../api/http'

type Status = 'idle' | 'loading' | 'success' | 'error'
type Section = 'create' | 'users' | 'reports'

const sections: Array<{ id: Section; label: string }> = [
  { id: 'create', label: 'Crear usuarios internos' },
  { id: 'users', label: 'Usuarios' },
  { id: 'reports', label: 'Reportes' },
]

const emptyCreateForm = {
  email: '',
  fullName: '',
  password: '',
  role: 'host' as InternalUserRole,
}

const emptyUsersFilter = {
  role: '',
  isActive: '',
}

const emptyOccupancy = { date: '', shiftId: '' }
const emptyFrequent = { minVisits: '2', limit: '20' }

export function AdminPage() {
  const [activeSection, setActiveSection] = useState<Section>('create')
  const [createForm, setCreateForm] = useState(emptyCreateForm)
  const [createState, setCreateState] = useState<{ status: Status; message: string }>({
    status: 'idle',
    message: '',
  })
  const [usersFilter, setUsersFilter] = useState(emptyUsersFilter)
  const [usersState, setUsersState] = useState<{
    status: Status
    message: string
    data: AdminUser[]
  }>({
    status: 'idle',
    message: '',
    data: [],
  })
  const [usersActionState, setUsersActionState] = useState<{ status: Status; message: string }>({
    status: 'idle',
    message: '',
  })
  const [occupancyForm, setOccupancyForm] = useState(emptyOccupancy)
  const [occupancyState, setOccupancyState] = useState<{
    status: Status
    message: string
    data: DailyOccupancyRow[]
  }>({
    status: 'idle',
    message: '',
    data: [],
  })
  const [frequentForm, setFrequentForm] = useState(emptyFrequent)
  const [frequentState, setFrequentState] = useState<{
    status: Status
    message: string
    data: FrequentCustomerRow[]
  }>({
    status: 'idle',
    message: '',
    data: [],
  })

  const userQuery = useMemo<ListUsersQuery>(() => {
    const query: ListUsersQuery = {}

    if (usersFilter.role) {
      query.role = usersFilter.role as ListUsersQuery['role']
    }

    if (usersFilter.isActive) {
      query.isActive = usersFilter.isActive === 'true'
    }

    return query
  }, [usersFilter.isActive, usersFilter.role])

  const loadUsers = useCallback(async () => {
    setUsersState((state) => ({ ...state, status: 'loading', message: 'Cargando usuarios...' }))

    try {
      const data = await listUsers(userQuery)
      setUsersState({ status: 'success', message: 'Listado actualizado.', data })
    } catch (error) {
      setUsersState({ status: 'error', message: getApiErrorMessage(error), data: [] })
    }
  }, [userQuery])

  useEffect(() => {
    void (async () => {
      try {
        const data = await listUsers({})
        setUsersState({ status: 'success', message: 'Listado actualizado.', data })
      } catch (error) {
        setUsersState({ status: 'error', message: getApiErrorMessage(error), data: [] })
      }
    })()
  }, [])

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreateState({ status: 'loading', message: 'Creando usuario interno...' })

    try {
      const payload: CreateInternalUserRequest = omitEmptyString({
        email: createForm.email.trim(),
        fullName: createForm.fullName.trim(),
        password: createForm.password,
        role: createForm.role,
      })

      await createInternalUser(payload)
      setCreateForm(emptyCreateForm)
      setCreateState({ status: 'success', message: 'Usuario interno creado.' })
      if (usersState.status !== 'idle') {
        void loadUsers()
      }
    } catch (error) {
      setCreateState({ status: 'error', message: getApiErrorMessage(error) })
    }
  }

  const handleDeleteUser = async (user: AdminUser) => {
    if (!window.confirm(`Dar de baja a ${user.fullName}?`)) {
      return
    }

    setUsersActionState({ status: 'loading', message: 'Aplicando baja lógica...' })

    try {
      await deleteUser(user.id)
      setUsersActionState({ status: 'success', message: 'Usuario dado de baja.' })
      await loadUsers()
    } catch (error) {
      setUsersActionState({ status: 'error', message: getApiErrorMessage(error) })
    }
  }

  const loadOccupancy = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setOccupancyState({ status: 'loading', message: 'Cargando ocupación diaria...', data: [] })

    try {
      const payload: DailyOccupancyQuery = {
        date: occupancyForm.date || undefined,
        shiftId: occupancyForm.shiftId.trim() || undefined,
      }
      const { data } = await api.get<DailyOccupancyRow[]>('/reports/daily-occupancy', {
        params: payload,
      })
      setOccupancyState({ status: 'success', message: 'Reporte listo.', data })
    } catch (error) {
      setOccupancyState({ status: 'error', message: getApiErrorMessage(error), data: [] })
    }
  }

  const loadFrequentCustomers = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFrequentState({
      status: 'loading',
      message: 'Cargando clientes frecuentes...',
      data: [],
    })

    try {
      const payload: FrequentCustomersQuery = {
        minVisits: Number(frequentForm.minVisits),
        limit: Number(frequentForm.limit),
      }
      const { data } = await api.get<FrequentCustomerRow[]>('/reports/frequent-customers', {
        params: payload,
      })
      setFrequentState({ status: 'success', message: 'Listado listo.', data })
    } catch (error) {
      setFrequentState({ status: 'error', message: getApiErrorMessage(error), data: [] })
    }
  }

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Solo administradores</p>
          <h2>Panel de administración</h2>
        </div>
        <p className="muted">Gestión de usuarios internos, altas y reportes operativos.</p>
      </div>

      <div className="tabbar tabbar-compact" aria-label="Secciones del panel">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            className={section.id === activeSection ? 'tab tab-active' : 'tab'}
            onClick={() => setActiveSection(section.id)}
          >
            {section.label}
          </button>
        ))}
      </div>

      {activeSection === 'create' ? (
        <article className="panel form-panel fade-in">
          <h3>Crear usuarios internos</h3>
          <p className="muted">
            Generá cuentas para host o gerente con contraseña cifrada en bcrypt.
          </p>

          <form className="form-panel" onSubmit={handleCreateUser}>
            <div className="form-grid">
              <label>
                Nombre completo
                <input
                  value={createForm.fullName}
                  onChange={(event) =>
                    setCreateForm({ ...createForm, fullName: event.target.value })
                  }
                  autoComplete="name"
                  required
                />
              </label>
              <label>
                Rol
                <select
                  value={createForm.role}
                  onChange={(event) =>
                    setCreateForm({
                      ...createForm,
                      role: event.target.value as InternalUserRole,
                    })
                  }
                >
                  <option value="host">Host</option>
                  <option value="manager">Gerente</option>
                </select>
              </label>
            </div>

            <div className="form-grid">
              <label>
                Email
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(event) =>
                    setCreateForm({ ...createForm, email: event.target.value })
                  }
                  autoComplete="email"
                  required
                />
              </label>
              <label>
                Contraseña
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(event) =>
                    setCreateForm({ ...createForm, password: event.target.value })
                  }
                  autoComplete="new-password"
                  required
                />
              </label>
            </div>

            <button type="submit" className="button button-primary">
              Crear usuario
            </button>
            <StatusMessage status={createState.status} message={createState.message} />
          </form>
        </article>
      ) : null}

      {activeSection === 'users' ? (
        <article className="panel form-panel fade-in">
          <div className="panel-heading">
            <div>
              <h3>Usuarios</h3>
              <p className="muted">Listado de host, gerente y cliente sin exponer password_hash.</p>
            </div>
            <button type="button" className="button button-secondary" onClick={loadUsers}>
              Actualizar
            </button>
          </div>

          <div className="form-grid">
            <label>
              Rol
              <select
                value={usersFilter.role}
                onChange={(event) =>
                  setUsersFilter({ ...usersFilter, role: event.target.value })
                }
              >
                <option value="">Todos</option>
                <option value="host">Host</option>
                <option value="manager">Gerente</option>
                <option value="customer">Cliente</option>
              </select>
            </label>
            <label>
              Estado
              <select
                value={usersFilter.isActive}
                onChange={(event) =>
                  setUsersFilter({ ...usersFilter, isActive: event.target.value })
                }
              >
                <option value="">Todos</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </select>
            </label>
          </div>

          <div className="button-row">
            <button type="button" className="button button-primary" onClick={loadUsers}>
              Aplicar filtros
            </button>
          </div>

          <StatusMessage status={usersState.status} message={usersState.message} />
          <StatusMessage status={usersActionState.status} message={usersActionState.message} />

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Último ingreso</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usersState.data.length ? (
                  usersState.data.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <strong>{user.fullName}</strong>
                        <div className="subtle">{user.email}</div>
                      </td>
                      <td>{formatUserRole(user.role)}</td>
                      <td>{user.isActive ? 'Activo' : 'Inactivo'}</td>
                      <td>{formatDateTime(user.lastLoginAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="button button-ghost button-tight"
                          onClick={() => handleDeleteUser(user)}
                          disabled={!user.isActive}
                        >
                          {user.isActive ? 'Dar de baja' : 'Ya dado de baja'}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>Sin usuarios para mostrar.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      ) : null}

      {activeSection === 'reports' ? (
        <div className="two-column-grid fade-in">
          <form className="panel form-panel" onSubmit={loadOccupancy}>
            <h3>Ocupación diaria</h3>
            <div className="form-grid">
              <label>
                Fecha
                <input
                  type="date"
                  value={occupancyForm.date}
                  onChange={(event) =>
                    setOccupancyForm({ ...occupancyForm, date: event.target.value })
                  }
                />
              </label>
              <label>
                ID del turno
                <input
                  value={occupancyForm.shiftId}
                  onChange={(event) =>
                    setOccupancyForm({ ...occupancyForm, shiftId: event.target.value })
                  }
                />
              </label>
            </div>

            <button type="submit" className="button button-primary">
              Consultar
            </button>
            <StatusMessage status={occupancyState.status} message={occupancyState.message} />

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Turno</th>
                    <th>Fecha</th>
                    <th>Mesas ocupadas</th>
                    <th>Capacidad</th>
                    <th>% ocupación</th>
                  </tr>
                </thead>
                <tbody>
                  {occupancyState.data.length ? (
                    occupancyState.data.map((row) => (
                      <tr key={`${row.shiftId}-${row.shiftDate}`}>
                        <td>{row.shiftName}</td>
                        <td>{formatDate(row.shiftDate)}</td>
                        <td>
                          {row.occupiedTables}/{row.totalTables}
                        </td>
                        <td>
                          {row.reservedGuests}/{row.totalCapacity}
                        </td>
                        <td>{formatPercent(row.occupancyPercent)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5}>Sin datos cargados.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </form>

          <form className="panel form-panel" onSubmit={loadFrequentCustomers}>
            <h3>Clientes frecuentes</h3>
            <div className="form-grid">
              <label>
                Mínimo de visitas
                <input
                  type="number"
                  min={1}
                  value={frequentForm.minVisits}
                  onChange={(event) =>
                    setFrequentForm({ ...frequentForm, minVisits: event.target.value })
                  }
                />
              </label>
              <label>
                Límite
                <input
                  type="number"
                  min={1}
                  value={frequentForm.limit}
                  onChange={(event) =>
                    setFrequentForm({ ...frequentForm, limit: event.target.value })
                  }
                />
              </label>
            </div>

            <button type="submit" className="button button-secondary">
              Consultar
            </button>
            <StatusMessage status={frequentState.status} message={frequentState.message} />

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Visitas</th>
                    <th>Ausencias</th>
                    <th>Última visita</th>
                  </tr>
                </thead>
                <tbody>
                  {frequentState.data.length ? (
                    frequentState.data.map((row) => (
                      <tr key={row.customerId}>
                        <td>
                          <strong>{row.fullName}</strong>
                          <div className="subtle">{row.email ?? row.phone ?? row.customerId}</div>
                        </td>
                        <td>{row.visitCount}</td>
                        <td>{row.noShowCount}</td>
                        <td>{formatDateTime(row.lastVisitAt)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4}>Sin datos cargados.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  )
}
