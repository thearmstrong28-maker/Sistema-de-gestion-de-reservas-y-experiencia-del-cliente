import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  createInternalUser,
  createTablesBulk,
  deleteUser,
  fetchDailyReportComparison,
  fetchDailyReportSummary,
  fetchEstablishmentSummary,
  fetchFrequentCustomers,
  listTables,
  listUsers,
} from '../api/admin'
import { getApiErrorMessage } from '../api/http'
import type {
  AdminUser,
  CreateInternalUserRequest,
  CreateTablesBulkRequest,
  DailyComparisonRow,
  DailyReportSummary,
  DailySummaryQuery,
  FrequentCustomerRow,
  InternalUserRole,
  RestaurantTable,
  EstablishmentSummary,
} from '../api/types'
import { StatusMessage } from '../components/StatusMessage'
import { formatDateTime, formatPercent } from '../lib/format'
import { formatUserRole } from '../lib/labels'
import { omitEmptyString } from '../lib/forms'
import { useAuthStore } from '../store/auth'

type Status = 'idle' | 'loading' | 'success' | 'error'
type AdminTab = 'usuarios' | 'mesas' | 'reportes'

interface ResultState<T> {
  status: Status
  message: string
  data: T
}

interface ReportFilters {
  date: string
  days: string
  minVisits: string
  limit: string
}

const today = new Date().toISOString().slice(0, 10)

const emptyCreateUserForm = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  role: 'customer' as InternalUserRole,
}

const emptyTablesForm = {
  quantity: '1',
  capacity: '',
}

const initialReportFilters: ReportFilters = {
  date: today,
  days: '7',
  minVisits: '2',
  limit: '8',
}

const adminTabs: Array<{ id: AdminTab; label: string; description: string }> = [
  { id: 'usuarios', label: 'Usuarios', description: 'Altas y bajas lógicas.' },
  { id: 'mesas', label: 'Mesas', description: 'Carga masiva y mapa visual.' },
  { id: 'reportes', label: 'Reportes', description: 'Resumen, comparativo y clientes frecuentes.' },
]

const parsePositiveInteger = (value: string, fallback: number): number => {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback
  }

  return Math.trunc(parsed)
}

export function AdministrationPage() {
  const profile = useAuthStore((state) => state.profile)
  const [activeTab, setActiveTab] = useState<AdminTab>('usuarios')
  const [establishmentState, setEstablishmentState] = useState<
    ResultState<EstablishmentSummary | null>
  >({
    status: 'idle',
    message: '',
    data: null,
  })
  const [createUserForm, setCreateUserForm] = useState(emptyCreateUserForm)
  const [createUserState, setCreateUserState] = useState<{ status: Status; message: string }>({
    status: 'idle',
    message: '',
  })
  const [usersState, setUsersState] = useState<ResultState<AdminUser[]>>({
    status: 'idle',
    message: '',
    data: [],
  })
  const [usersActionState, setUsersActionState] = useState<{ status: Status; message: string }>({
    status: 'idle',
    message: '',
  })
  const [tablesForm, setTablesForm] = useState(emptyTablesForm)
  const [tablesState, setTablesState] = useState<ResultState<RestaurantTable[]>>({
    status: 'idle',
    message: '',
    data: [],
  })
  const [tablesActionState, setTablesActionState] = useState<{ status: Status; message: string }>({
    status: 'idle',
    message: '',
  })
  const [selectedTableId, setSelectedTableId] = useState('')
  const [reportFilters, setReportFilters] = useState<ReportFilters>(initialReportFilters)
  const [dailySummaryState, setDailySummaryState] = useState<
    ResultState<DailyReportSummary | null>
  >({
    status: 'idle',
    message: '',
    data: null,
  })
  const [comparisonState, setComparisonState] = useState<ResultState<DailyComparisonRow[]>>({
    status: 'idle',
    message: '',
    data: [],
  })
  const [frequentState, setFrequentState] = useState<ResultState<FrequentCustomerRow[]>>({
    status: 'idle',
    message: '',
    data: [],
  })

  const restaurantName = useMemo(
    () =>
      dailySummaryState.data?.restaurantName ||
      profile?.restaurantName ||
      establishmentState.data?.restaurantName ||
      'Restaurante principal',
    [dailySummaryState.data?.restaurantName, establishmentState.data?.restaurantName, profile?.restaurantName],
  )

  const selectedTable = useMemo(
    () => tablesState.data.find((table) => table.id === selectedTableId) ?? tablesState.data[0] ?? null,
    [selectedTableId, tablesState.data],
  )

  const loadOverview = useCallback(async () => {
    setEstablishmentState({
      status: 'loading',
      message: 'Cargando datos del establecimiento...',
      data: null,
    })

    try {
      const data = await fetchEstablishmentSummary()
      setEstablishmentState({
        status: 'success',
        message: 'Datos del establecimiento listos.',
        data,
      })
    } catch (error) {
      setEstablishmentState({
        status: 'error',
        message: getApiErrorMessage(error),
        data: null,
      })
    }
  }, [])

  const loadUsers = useCallback(async () => {
    setUsersState((state) => ({
      ...state,
      status: 'loading',
      message: 'Cargando usuarios...',
    }))

    try {
      const data = await listUsers({})
      setUsersState({
        status: 'success',
        message: 'Listado de usuarios actualizado.',
        data,
      })
    } catch (error) {
      setUsersState({
        status: 'error',
        message: getApiErrorMessage(error),
        data: [],
      })
    }
  }, [])

  const loadTables = useCallback(async () => {
    setTablesState((state) => ({
      ...state,
      status: 'loading',
      message: 'Cargando mesas...',
    }))

    try {
      const data = await listTables()
      setTablesState({
        status: 'success',
        message: 'Mapa de mesas actualizado.',
        data,
      })
    } catch (error) {
      setTablesState({
        status: 'error',
        message: getApiErrorMessage(error),
        data: [],
      })
    }
  }, [])

  const loadDailySummary = useCallback(async (filters: ReportFilters) => {
    setDailySummaryState({
      status: 'loading',
      message: 'Cargando resumen diario...',
      data: null,
    })

    try {
      const query: DailySummaryQuery = {
        date: filters.date || undefined,
      }
      const data = await fetchDailyReportSummary(query)
      setDailySummaryState({
        status: 'success',
        message: 'Resumen diario listo.',
        data,
      })
    } catch (error) {
      setDailySummaryState({
        status: 'error',
        message: getApiErrorMessage(error),
        data: null,
      })
    }
  }, [])

  const loadComparison = useCallback(async (filters: ReportFilters) => {
    setComparisonState({
      status: 'loading',
      message: 'Cargando comparativo...',
      data: [],
    })

    try {
      const data = await fetchDailyReportComparison({
        date: filters.date || undefined,
        days: parsePositiveInteger(filters.days, 7),
      })
      setComparisonState({
        status: 'success',
        message: 'Comparativo actualizado.',
        data,
      })
    } catch (error) {
      setComparisonState({
        status: 'error',
        message: getApiErrorMessage(error),
        data: [],
      })
    }
  }, [])

  const loadFrequentCustomers = useCallback(async (filters: ReportFilters) => {
    setFrequentState({
      status: 'loading',
      message: 'Cargando clientes frecuentes...',
      data: [],
    })

    try {
      const data = await fetchFrequentCustomers({
        minVisits: parsePositiveInteger(filters.minVisits, 2),
        limit: parsePositiveInteger(filters.limit, 8),
      })
      setFrequentState({
        status: 'success',
        message: 'Clientes frecuentes listos.',
        data,
      })
    } catch (error) {
      setFrequentState({
        status: 'error',
        message: getApiErrorMessage(error),
        data: [],
      })
    }
  }, [])

  const loadReports = useCallback(
    async (filters: ReportFilters) => {
      await Promise.all([
        loadDailySummary(filters),
        loadComparison(filters),
        loadFrequentCustomers(filters),
      ])
    },
    [loadComparison, loadDailySummary, loadFrequentCustomers],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOverview()
      void loadUsers()
      void loadTables()
      void loadReports(initialReportFilters)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadOverview, loadReports, loadTables, loadUsers])

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreateUserState({ status: 'loading', message: 'Creando usuario...' })

    try {
      const payload: CreateInternalUserRequest = omitEmptyString({
        email: createUserForm.email.trim(),
        fullName: createUserForm.fullName.trim(),
        phone: createUserForm.phone.trim(),
        password: createUserForm.password,
        role: createUserForm.role,
      })

      await createInternalUser(payload)
      setCreateUserForm(emptyCreateUserForm)
      setCreateUserState({ status: 'success', message: 'Usuario creado correctamente.' })
      await Promise.all([loadUsers(), loadOverview()])
    } catch (error) {
      setCreateUserState({
        status: 'error',
        message: getApiErrorMessage(error),
      })
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
      await Promise.all([loadUsers(), loadOverview()])
    } catch (error) {
      setUsersActionState({
        status: 'error',
        message: getApiErrorMessage(error),
      })
    }
  }

  const handleCreateTables = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTablesActionState({ status: 'loading', message: 'Creando mesas...' })

    try {
      const payload: CreateTablesBulkRequest = {
        quantity: parsePositiveInteger(tablesForm.quantity, 1),
        ...(tablesForm.capacity.trim()
          ? { capacity: parsePositiveInteger(tablesForm.capacity, 2) }
          : {}),
      }

      await createTablesBulk(payload)
      setTablesForm(emptyTablesForm)
      setTablesActionState({ status: 'success', message: 'Mesas creadas correctamente.' })
      await Promise.all([loadTables(), loadOverview()])
    } catch (error) {
      setTablesActionState({
        status: 'error',
        message: getApiErrorMessage(error),
      })
    }
  }

  const handleRefreshReports = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await loadReports(reportFilters)
  }

  const overviewCards = [
    { label: 'Usuarios', value: establishmentState.data?.usersCount ?? 0 },
    { label: 'Activos', value: establishmentState.data?.activeUsersCount ?? 0 },
    { label: 'Mesas', value: establishmentState.data?.tablesCount ?? 0 },
    { label: 'Mesas activas', value: establishmentState.data?.activeTablesCount ?? 0 },
    { label: 'Reservas', value: establishmentState.data?.reservationsCount ?? 0 },
    { label: 'Clientes', value: establishmentState.data?.customerUsersCount ?? 0 },
  ]

  const summaryCards = [
    {
      label: 'Reservas del día',
      value: dailySummaryState.data?.reservationsCount ?? 0,
    },
    {
      label: 'Asistencias',
      value: dailySummaryState.data?.attendedCount ?? 0,
    },
    {
      label: 'Clientes',
      value: dailySummaryState.data?.customerCount ?? 0,
    },
    {
      label: 'Sin asistencia',
      value: dailySummaryState.data?.noShowCount ?? 0,
    },
  ]

  const maxComparisonValue = Math.max(
    1,
    ...comparisonState.data.map((row) => row.reservationsCount),
  )

  return (
    <section className="page-stack establishment-page fade-in">
      <article className="panel establishment-hero">
        <div className="establishment-hero-copy">
          <p className="eyebrow">Panel administrativo</p>
          <h2>Administración del {restaurantName}</h2>
          <p className="lead">{restaurantName}</p>
          <p className="muted">Usuarios, mesas y reportes operativos en un solo lugar.</p>
        </div>

        <div className="summary-grid establishment-overview-grid">
          {overviewCards.map((card) => (
            <article key={card.label} className="panel summary-card summary-card-compact">
              <p className="eyebrow">{card.label}</p>
              <h3>{card.value}</h3>
            </article>
          ))}
        </div>
      </article>

      <StatusMessage status={establishmentState.status} message={establishmentState.message} />

      <div className="admin-tabs" role="tablist" aria-label={`Secciones de Administración del ${restaurantName}`}>
        {adminTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? 'admin-tab admin-tab-active' : 'admin-tab'}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.label}</span>
            <small>{tab.description}</small>
          </button>
        ))}
      </div>

      {activeTab === 'usuarios' ? (
        <div className="two-column-grid">
          <article className="panel form-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Usuarios</p>
                <h3>Crear usuario</h3>
              </div>
              <button type="button" className="button button-secondary" onClick={loadUsers}>
                Actualizar
              </button>
            </div>

            <form className="form-panel" onSubmit={handleCreateUser}>
              <div className="form-grid">
                <label>
                  Nombre completo
                  <input
                    value={createUserForm.fullName}
                    onChange={(event) =>
                      setCreateUserForm({ ...createUserForm, fullName: event.target.value })
                    }
                    autoComplete="name"
                    required
                  />
                </label>

                <label>
                  Rol
                  <select
                    value={createUserForm.role}
                    onChange={(event) =>
                      setCreateUserForm({
                        ...createUserForm,
                        role: event.target.value as InternalUserRole,
                      })
                    }
                  >
                    <option value="customer">Cliente</option>
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
                    value={createUserForm.email}
                    onChange={(event) =>
                      setCreateUserForm({ ...createUserForm, email: event.target.value })
                    }
                    autoComplete="email"
                    required
                  />
                </label>

                <label>
                  Teléfono (opcional)
                  <input
                    type="tel"
                    value={createUserForm.phone}
                    onChange={(event) =>
                      setCreateUserForm({ ...createUserForm, phone: event.target.value })
                    }
                    autoComplete="tel"
                  />
                </label>
              </div>

              <label>
                Contraseña
                <input
                  type="password"
                  value={createUserForm.password}
                  onChange={(event) =>
                    setCreateUserForm({ ...createUserForm, password: event.target.value })
                  }
                  autoComplete="new-password"
                  required
                />
              </label>

              <button type="submit" className="button button-primary">
                Crear usuario
              </button>
              <StatusMessage status={createUserState.status} message={createUserState.message} />
            </form>
          </article>

          <article className="panel form-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Usuarios</p>
                <h3>Listado de usuarios</h3>
              </div>
              <button type="button" className="button button-secondary" onClick={loadUsers}>
                Actualizar
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
                          <div className="subtle">{user.phone ?? 'Sin teléfono'}</div>
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
                            {user.isActive ? 'Dar de baja' : 'Baja aplicada'}
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
        </div>
      ) : null}

      {activeTab === 'mesas' ? (
        <div className="stacked-panels">
          <article className="panel form-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Mesas</p>
                <h3>Alta masiva</h3>
              </div>
              <button type="button" className="button button-secondary" onClick={loadTables}>
                Actualizar
              </button>
            </div>

            <form className="form-panel" onSubmit={handleCreateTables}>
              <div className="form-grid">
                <label>
                  Cantidad de mesas
                  <input
                    type="number"
                    min={1}
                    value={tablesForm.quantity}
                    onChange={(event) =>
                      setTablesForm({ ...tablesForm, quantity: event.target.value })
                    }
                    required
                  />
                </label>

                <label>
                  Capacidad inicial (opcional)
                  <input
                    type="number"
                    min={1}
                    value={tablesForm.capacity}
                    onChange={(event) =>
                      setTablesForm({ ...tablesForm, capacity: event.target.value })
                    }
                  />
                </label>
              </div>

              <p className="muted">
                Si no indicás capacidad, las mesas nuevas nacen con 2 plazas.
              </p>

              <button type="submit" className="button button-primary">
                Crear mesas
              </button>
              <StatusMessage status={tablesActionState.status} message={tablesActionState.message} />
            </form>
          </article>

          <div className="two-column-grid">
            <article className="panel form-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Mesas</p>
                  <h3>Mapa visual</h3>
                </div>
              </div>

              <StatusMessage status={tablesState.status} message={tablesState.message} />

              <div className="table-map">
                {tablesState.data.length ? (
                  tablesState.data.map((table) => (
                    <button
                      key={table.id}
                      type="button"
                      className={
                        (selectedTableId || tablesState.data[0]?.id) === table.id
                          ? 'table-card table-card-active'
                          : 'table-card'
                      }
                      onClick={() => setSelectedTableId(table.id)}
                    >
                      <p className="eyebrow">Mesa {table.tableNumber}</p>
                      <h3>{table.capacity} plazas</h3>
                      <p className="muted">{table.isActive ? 'Activa' : 'Inactiva'}</p>
                    </button>
                  ))
                ) : (
                  <div className="empty-state">Todavía no hay mesas para mostrar.</div>
                )}
              </div>
            </article>

            <article className="panel form-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Mesas</p>
                  <h3>Detalle</h3>
                </div>
              </div>

              {selectedTable ? (
                <div className="selected-table-card">
                  <p className="eyebrow">Mesa {selectedTable.tableNumber}</p>
                  <h3>{selectedTable.capacity} plazas</h3>
                  <p className="muted">ID: {selectedTable.id}</p>
                  <p className="muted">Estado: {selectedTable.isActive ? 'Activa' : 'Inactiva'}</p>
                </div>
              ) : (
                <div className="empty-state">Seleccioná una mesa para ver su detalle.</div>
              )}

              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Número</th>
                      <th>Capacidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tablesState.data.length ? (
                      tablesState.data.map((table) => (
                        <tr key={table.id}>
                          <td className="subtle">{table.id}</td>
                          <td>{table.tableNumber}</td>
                          <td>{table.capacity}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3}>Sin mesas para mostrar.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </div>
        </div>
      ) : null}

      {activeTab === 'reportes' ? (
        <div className="stacked-panels">
          <article className="panel form-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Reportes</p>
                <h3>Resumen y comparativo</h3>
              </div>
              <button type="button" className="button button-secondary" onClick={() => void loadReports(reportFilters)}>
                Actualizar
              </button>
            </div>

            <form className="form-panel" onSubmit={handleRefreshReports}>
              <div className="form-grid">
                <label>
                  Fecha del resumen
                  <input
                    type="date"
                    value={reportFilters.date}
                    onChange={(event) =>
                      setReportFilters({ ...reportFilters, date: event.target.value })
                    }
                  />
                </label>

                <label>
                  Días para comparativo
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={reportFilters.days}
                    onChange={(event) =>
                      setReportFilters({ ...reportFilters, days: event.target.value })
                    }
                  />
                </label>
              </div>

              <div className="form-grid">
                <label>
                  Mínimo de visitas
                  <input
                    type="number"
                    min={1}
                    value={reportFilters.minVisits}
                    onChange={(event) =>
                      setReportFilters({ ...reportFilters, minVisits: event.target.value })
                    }
                  />
                </label>

                <label>
                  Límite de clientes frecuentes
                  <input
                    type="number"
                    min={1}
                    value={reportFilters.limit}
                    onChange={(event) =>
                      setReportFilters({ ...reportFilters, limit: event.target.value })
                    }
                  />
                </label>
              </div>

              <button type="submit" className="button button-primary">
                Consultar reportes
              </button>
            </form>
          </article>

          <StatusMessage status={dailySummaryState.status} message={dailySummaryState.message} />

          <div className="summary-grid">
            {summaryCards.map((card) => (
              <article key={card.label} className="panel summary-card">
                <p className="eyebrow">{card.label}</p>
                <h3>{card.value}</h3>
              </article>
            ))}
          </div>

          <article className="panel report-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Reportes</p>
                <h3>Comparativo últimos días</h3>
              </div>
            </div>

            <StatusMessage status={comparisonState.status} message={comparisonState.message} />

            {comparisonState.data.length ? (
              <div className="comparison-chart" role="img" aria-label="Comparativo de reservas por día">
                {comparisonState.data.map((row) => {
                  const height = Math.max(12, (row.reservationsCount / maxComparisonValue) * 100)

                  return (
                    <div key={row.reportDate} className="chart-column">
                      <div className="chart-track">
                        <div
                          className="chart-bar"
                          style={{ height: `${height}%` }}
                          aria-label={`${row.reportDate}: ${row.reservationsCount} reservas`}
                        />
                      </div>
                      <strong>{row.reservationsCount}</strong>
                      <span>{row.reportDate.slice(5)}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="empty-state">Sin datos para comparar.</div>
            )}

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Reservas</th>
                    <th>Asistencias</th>
                    <th>Clientes</th>
                    <th>% asistencia</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonState.data.length ? (
                    comparisonState.data.map((row) => (
                      <tr key={row.reportDate}>
                        <td>{row.reportDate}</td>
                        <td>{row.reservationsCount}</td>
                        <td>{row.attendedCount}</td>
                        <td>{row.customerCount}</td>
                        <td>{formatPercent(row.attendancePercent)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5}>Sin datos para mostrar.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel report-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Reportes</p>
                <h3>Clientes frecuentes</h3>
              </div>
            </div>

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
                      <td colSpan={4}>Sin datos para mostrar.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      ) : null}
    </section>
  )
}
