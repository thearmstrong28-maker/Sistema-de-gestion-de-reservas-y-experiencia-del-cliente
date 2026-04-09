import { Fragment, useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import axios from 'axios'
import {
  createInternalUser,
  createTablesDistribution,
  deleteReportSnapshot,
  deleteUser,
  fetchDailyReportComparison,
  fetchDailyReportSummary,
  fetchEstablishmentSummary,
  fetchFrequentCustomers,
  listReportSnapshots,
  listTables,
  listUsers,
  updateUser,
} from '../api/admin'
import { verifyAdminPassword } from '../api/auth'
import { getApiErrorMessage } from '../api/http'
import type {
  AdminUser,
  CreateInternalUserRequest,
  CreateTablesDistributionRequest,
  DailyComparisonRow,
  DailyReportSummary,
  DailySummaryQuery,
  EstablishmentSummary,
  FrequentCustomerRow,
  InternalUserRole,
  ReportSnapshot,
  RestaurantTable,
  TableDistributionItem,
  EditableUserRole,
  UpdateUserRequest,
} from '../api/types'
import { StatusMessage } from '../components/StatusMessage'
import { formatDateTime, formatPercent } from '../lib/format'
import { formatUserRole } from '../lib/labels'
import { omitEmptyString } from '../lib/forms'
import { useAuthStore } from '../store/auth'
import editIcon from '../assets/icon-edit.png'
import deleteIcon from '../assets/icon-delete.png'

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

interface TablesDistributionForm {
  quantity: string
  capacity: string
  startNumber: string
  columns: string
  spacingX: string
  spacingY: string
  layoutLabel: string
}

interface UserEditForm {
  fullName: string
  email: string
  phone: string
  role: EditableUserRole
}

const today = new Date().toISOString().slice(0, 10)

const emptyCreateUserForm = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  role: 'host' as InternalUserRole,
}

const emptyDistributionForm: TablesDistributionForm = {
  quantity: '4',
  capacity: '4',
  startNumber: '1',
  columns: '4',
  spacingX: '120',
  spacingY: '120',
  layoutLabel: 'Principal',
}

const emptyUserEditForm: UserEditForm = {
  fullName: '',
  email: '',
  phone: '',
  role: 'host',
}

const editableUserRoles: Array<{ value: EditableUserRole; label: string }> = [
  { value: 'host', label: 'Recepcionista' },
  { value: 'manager', label: 'Gerente' },
  { value: 'customer', label: 'Cliente' },
]

const initialReportFilters: ReportFilters = {
  date: today,
  days: '7',
  minVisits: '2',
  limit: '8',
}

const adminTabs: Array<{ id: AdminTab; label: string; description: string }> = [
  { id: 'usuarios', label: 'Usuarios', description: 'Alta y baja de recepcionistas, gerentes y clientes.' },
  { id: 'mesas', label: 'Mesas', description: 'Distribución visual y capacidad por mesa.' },
  { id: 'reportes', label: 'Reportes', description: 'Métricas, comparativo y gestión de snapshots.' },
]

const parsePositiveInteger = (value: string, fallback: number): number => {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback
  }

  return Math.trunc(parsed)
}

const getAdminUnlockErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'No se pudo conectar con el servidor. Verificá que el backend esté activo y la URL de la API sea correcta.'
    }

    if (error.response.status === 401) {
      return 'La contraseña es incorrecta. Probá nuevamente.'
    }
  }

  return getApiErrorMessage(error)
}

export function AdministrationPage() {
  const profile = useAuthStore((state) => state.profile)
  const [activeTab, setActiveTab] = useState<AdminTab>('usuarios')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminAccessState, setAdminAccessState] = useState<{ status: Status; message: string; unlocked: boolean }>(
    {
      status: 'idle',
      message: 'Por seguridad, verificá tu contraseña para abrir Administración.',
      unlocked: false,
    },
  )
  const [establishmentState, setEstablishmentState] = useState<ResultState<EstablishmentSummary | null>>({
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
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [userEditForm, setUserEditForm] = useState<UserEditForm>(emptyUserEditForm)
  const [tablesForm, setTablesForm] = useState<TablesDistributionForm>(emptyDistributionForm)
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
  const [dailySummaryState, setDailySummaryState] = useState<ResultState<DailyReportSummary | null>>({
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
  const [snapshotsState, setSnapshotsState] = useState<ResultState<ReportSnapshot[]>>({
    status: 'idle',
    message: '',
    data: [],
  })
  const [snapshotsActionState, setSnapshotsActionState] = useState<{ status: Status; message: string }>({
    status: 'idle',
    message: '',
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

  const tableLayoutCoordinates = useMemo(() => {
    const xValues = Array.from(new Set(tablesState.data.map((table) => table.posX ?? 0))).sort((a, b) => a - b)
    const yValues = Array.from(new Set(tablesState.data.map((table) => table.posY ?? 0))).sort((a, b) => a - b)
    const xIndex = new Map(xValues.map((value, index) => [value, index + 1]))
    const yIndex = new Map(yValues.map((value, index) => [value, index + 1]))

    return {
      columns: Math.max(1, xValues.length),
      xIndex,
      yIndex,
    }
  }, [tablesState.data])

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
      const data = await listUsers({ isActive: true })
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

  const resetUserEditForm = useCallback(() => {
    setEditingUserId(null)
    setUserEditForm(emptyUserEditForm)
  }, [])

  const startEditingUser = useCallback((user: AdminUser) => {
    setEditingUserId(user.id)
    setUserEditForm({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone ?? '',
      role: user.role === 'admin' ? 'host' : user.role,
    })
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
        message: 'Distribución de mesas actualizada.',
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

  const loadSnapshots = useCallback(async () => {
    setSnapshotsState({
      status: 'loading',
      message: 'Cargando reportes generados...',
      data: [],
    })

    try {
      const data = await listReportSnapshots()
      setSnapshotsState({
        status: 'success',
        message: 'Reportes generados listos.',
        data,
      })
    } catch (error) {
      setSnapshotsState({
        status: 'error',
        message: getApiErrorMessage(error),
        data: [],
      })
    }
  }, [])

  const loadReports = useCallback(
    async (filters: ReportFilters) => {
      await Promise.all([loadDailySummary(filters), loadComparison(filters), loadFrequentCustomers(filters), loadSnapshots()])
    },
    [loadComparison, loadDailySummary, loadFrequentCustomers, loadSnapshots],
  )

  useEffect(() => {
    if (!adminAccessState.unlocked) {
      return
    }

    const timer = window.setTimeout(() => {
      void loadOverview()
      void loadUsers()
      void loadTables()
      void loadReports(initialReportFilters)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [adminAccessState.unlocked, loadOverview, loadReports, loadTables, loadUsers])

  const handleUnlockAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAdminAccessState({
      status: 'loading',
      message: 'Verificando contraseña de administrador...',
      unlocked: false,
    })

    try {
      await verifyAdminPassword(adminPassword)
      setAdminPassword('')
      setAdminAccessState({
        status: 'success',
        message: 'Acceso verificado. Bienvenido al panel de administración.',
        unlocked: true,
      })
    } catch (error) {
      setAdminAccessState({
        status: 'error',
        message: getAdminUnlockErrorMessage(error),
        unlocked: false,
      })
    }
  }

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreateUserState({ status: 'loading', message: 'Creando usuario interno...' })

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
      setUsersState((state) => ({
        ...state,
        data: state.data.filter((item) => item.id !== user.id),
      }))
      setUsersActionState({ status: 'success', message: 'Usuario dado de baja.' })
      if (editingUserId === user.id) {
        resetUserEditForm()
      }
      await Promise.all([loadUsers(), loadOverview()])
    } catch (error) {
      setUsersActionState({
        status: 'error',
        message: getApiErrorMessage(error),
      })
    }
  }

  const handleUpdateUser = async (event: FormEvent<HTMLFormElement>, userId: string) => {
    event.preventDefault()
    setUsersActionState({ status: 'loading', message: 'Guardando cambios del usuario...' })

    try {
      const payload: UpdateUserRequest = omitEmptyString({
        fullName: userEditForm.fullName.trim(),
        email: userEditForm.email.trim(),
        phone: userEditForm.phone.trim(),
        role: userEditForm.role,
      })

      const updatedUser = await updateUser(userId, payload)
      setUsersState((state) => ({
        ...state,
        data: state.data.map((item) => (item.id === userId ? updatedUser : item)),
      }))
      setUsersActionState({ status: 'success', message: 'Usuario actualizado correctamente.' })
      resetUserEditForm()
      await Promise.all([loadUsers(), loadOverview()])
    } catch (error) {
      setUsersActionState({
        status: 'error',
        message: getApiErrorMessage(error),
      })
    }
  }

  const buildDistributionItems = (form: TablesDistributionForm): TableDistributionItem[] => {
    const quantity = parsePositiveInteger(form.quantity, 1)
    const capacity = parsePositiveInteger(form.capacity, 2)
    const startNumber = parsePositiveInteger(form.startNumber, 1)
    const columns = parsePositiveInteger(form.columns, 4)
    const spacingX = parsePositiveInteger(form.spacingX, 120)
    const spacingY = parsePositiveInteger(form.spacingY, 120)
    const layoutLabel = form.layoutLabel.trim()

    return Array.from({ length: quantity }, (_, index) => ({
      tableNumber: startNumber + index,
      capacity,
      posX: (index % columns) * spacingX,
      posY: Math.floor(index / columns) * spacingY,
      ...(layoutLabel ? { layoutLabel } : {}),
    }))
  }

  const handleCreateDistribution = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTablesActionState({ status: 'loading', message: 'Guardando distribución de mesas...' })

    try {
      const payload: CreateTablesDistributionRequest = {
        tables: buildDistributionItems(tablesForm),
      }
      await createTablesDistribution(payload)
      setTablesActionState({ status: 'success', message: 'Distribución de mesas guardada.' })
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

  const handleDeleteSnapshot = async (snapshot: ReportSnapshot) => {
    if (!window.confirm(`Eliminar reporte del ${snapshot.reportDate}?`)) {
      return
    }

    setSnapshotsActionState({ status: 'loading', message: 'Eliminando reporte...' })

    try {
      await deleteReportSnapshot(snapshot.id)
      setSnapshotsActionState({ status: 'success', message: 'Reporte eliminado correctamente.' })
      await loadSnapshots()
    } catch (error) {
      setSnapshotsActionState({
        status: 'error',
        message: getApiErrorMessage(error),
      })
    }
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

  const maxComparisonValue = Math.max(1, ...comparisonState.data.map((row) => row.reservationsCount))

  if (!adminAccessState.unlocked) {
    return (
      <section className="page-stack establishment-page fade-in">
        <article className="panel form-panel auth-card">
          <div className="auth-intro">
            <p className="eyebrow">Acceso protegido</p>
            <h2>Administrador</h2>
            <p className="muted">
              Cada ingreso a esta pantalla solicita tu contraseña de administrador.
            </p>
          </div>

          <form className="form-panel" onSubmit={handleUnlockAdmin}>
            <label>
              Contraseña de inicio de sesión
              <input
                type="password"
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            <button type="submit" className="button button-primary">
              Verificar contraseña
            </button>
          </form>

          <StatusMessage status={adminAccessState.status} message={adminAccessState.message} />
        </article>
      </section>
    )
  }

  return (
    <section className="page-stack establishment-page fade-in">
      <article className="panel establishment-hero">
        <div className="establishment-hero-copy">
          <p className="eyebrow">Panel administrativo</p>
          <h2>Administración</h2>
          <p className="lead">{restaurantName}</p>
          <p className="muted">Usuarios, mesas y reportes operativos en un solo lugar.</p>
          <p className="muted">Nota: la asignación manual de mesas queda para Recepcionista.</p>
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

      <div className="admin-tabs" role="tablist" aria-label="Secciones de Administración">
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
        <div className="two-column-grid users-layout-grid">
          <article className="panel form-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Usuarios</p>
                <h3>Crear cuenta interna</h3>
              </div>
            </div>

            <form className="form-panel" onSubmit={handleCreateUser}>
              <div className="form-grid">
                <label>
                  Nombre
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
                    <option value="host">Recepcionista</option>
                    <option value="manager">Gerente</option>
                  </select>
                </label>
              </div>

              <div className="form-grid">
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

                <label>
                  Email (opcional)
                  <input
                    type="email"
                    value={createUserForm.email}
                    onChange={(event) => setCreateUserForm({ ...createUserForm, email: event.target.value })}
                    autoComplete="email"
                  />
                </label>
              </div>

              <label>
                Teléfono (opcional)
                <input
                  type="tel"
                  value={createUserForm.phone}
                  onChange={(event) => setCreateUserForm({ ...createUserForm, phone: event.target.value })}
                  autoComplete="tel"
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
                <h3>Listado y bajas</h3>
              </div>
            </div>

            <StatusMessage status={usersState.status} message={usersState.message} />
            <StatusMessage status={usersActionState.status} message={usersActionState.message} />

            <div className="table-scroll users-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Ultimo ingreso</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usersState.data.length ? (
                    usersState.data.map((user) => (
                      <Fragment key={user.id}>
                        <tr>
                          <td>
                            <strong>{user.fullName}</strong>
                            <div className="subtle">{user.email}</div>
                            <div className="subtle">{user.phone ?? 'Sin teléfono'}</div>
                          </td>
                          <td>{formatUserRole(user.role)}</td>
                          <td>{user.isActive ? 'Activo' : 'Inactivo'}</td>
                          <td>{formatDateTime(user.lastLoginAt)}</td>
                          <td>
                            <div className="user-actions">
                              <button
                                type="button"
                                className="button button-secondary button-icon button-icon-edit"
                                onClick={() => startEditingUser(user)}
                                aria-label="Editar usuario"
                              >
                                <img className="button-icon-image" src={editIcon} alt="" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                className="button button-ghost button-icon button-icon-delete"
                                onClick={() => handleDeleteUser(user)}
                                disabled={!user.isActive}
                                aria-label="Dar de baja usuario"
                              >
                                <img className="button-icon-image" src={deleteIcon} alt="" aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {editingUserId === user.id ? (
                          <tr className="user-edit-row">
                            <td colSpan={5}>
                              <form className="form-panel user-edit-form" onSubmit={(event) => void handleUpdateUser(event, user.id)}>
                                <div className="form-grid">
                                  <label>
                                    Nombre
                                    <input
                                      value={userEditForm.fullName}
                                      onChange={(event) =>
                                        setUserEditForm({ ...userEditForm, fullName: event.target.value })
                                      }
                                      autoComplete="name"
                                      required
                                    />
                                  </label>

                                  <label>
                                    Rol
                                    <select
                                      value={userEditForm.role}
                                      onChange={(event) =>
                                        setUserEditForm({
                                          ...userEditForm,
                                          role: event.target.value as EditableUserRole,
                                        })
                                      }
                                    >
                                      {editableUserRoles.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                </div>

                                <div className="form-grid">
                                  <label>
                                    Email (opcional)
                                    <input
                                      type="email"
                                      value={userEditForm.email}
                                      onChange={(event) =>
                                        setUserEditForm({ ...userEditForm, email: event.target.value })
                                      }
                                      autoComplete="email"
                                    />
                                  </label>

                                  <label>
                                    Teléfono (opcional)
                                    <input
                                      type="tel"
                                      value={userEditForm.phone}
                                      onChange={(event) =>
                                        setUserEditForm({ ...userEditForm, phone: event.target.value })
                                      }
                                      autoComplete="tel"
                                    />
                                  </label>
                                </div>

                                <div className="button-row">
                                  <button type="submit" className="button button-primary button-tight">
                                    Guardar cambios
                                  </button>
                                  <button
                                    type="button"
                                    className="button button-ghost button-tight"
                                    onClick={resetUserEditForm}
                                  >
                                    Cancelar
                                  </button>
                                </div>

                              </form>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
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
                <h3>Crear distribución</h3>
              </div>
              <button type="button" className="button button-secondary" onClick={loadTables}>
                Actualizar
              </button>
            </div>

            <form className="form-panel" onSubmit={handleCreateDistribution}>
              <div className="form-grid">
                <label>
                  Cantidad de mesas
                  <input
                    type="number"
                    min={1}
                    value={tablesForm.quantity}
                    onChange={(event) => setTablesForm({ ...tablesForm, quantity: event.target.value })}
                    required
                  />
                </label>

                <label>
                  Capacidad por mesa
                  <input
                    type="number"
                    min={1}
                    value={tablesForm.capacity}
                    onChange={(event) => setTablesForm({ ...tablesForm, capacity: event.target.value })}
                    required
                  />
                </label>
              </div>

              <div className="form-grid">
                <label>
                  Número inicial de mesa
                  <input
                    type="number"
                    min={1}
                    value={tablesForm.startNumber}
                    onChange={(event) => setTablesForm({ ...tablesForm, startNumber: event.target.value })}
                    required
                  />
                </label>

                <label>
                  Etiqueta de sector
                  <input
                    value={tablesForm.layoutLabel}
                    onChange={(event) => setTablesForm({ ...tablesForm, layoutLabel: event.target.value })}
                  />
                </label>
              </div>

              <div className="form-grid">
                <label>
                  Columnas del mapa
                  <input
                    type="number"
                    min={1}
                    value={tablesForm.columns}
                    onChange={(event) => setTablesForm({ ...tablesForm, columns: event.target.value })}
                    required
                  />
                </label>

                <label>
                  Separación X (px)
                  <input
                    type="number"
                    min={1}
                    value={tablesForm.spacingX}
                    onChange={(event) => setTablesForm({ ...tablesForm, spacingX: event.target.value })}
                    required
                  />
                </label>
              </div>

              <label>
                Separación Y (px)
                <input
                  type="number"
                  min={1}
                  value={tablesForm.spacingY}
                  onChange={(event) => setTablesForm({ ...tablesForm, spacingY: event.target.value })}
                  required
                />
              </label>

              <button type="submit" className="button button-primary">
                Guardar distribución
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

              <div
                className="table-map"
                style={{
                  gridTemplateColumns: `repeat(${tableLayoutCoordinates.columns}, minmax(130px, 1fr))`,
                }}
              >
                {tablesState.data.length ? (
                  tablesState.data.map((table) => (
                    <button
                      key={table.id}
                      type="button"
                      className={(selectedTableId || tablesState.data[0]?.id) === table.id ? 'table-card table-card-active' : 'table-card'}
                      style={{
                        gridColumn: tableLayoutCoordinates.xIndex.get(table.posX ?? 0) ?? 1,
                        gridRow: tableLayoutCoordinates.yIndex.get(table.posY ?? 0) ?? 1,
                      }}
                      onClick={() => setSelectedTableId(table.id)}
                    >
                      <p className="eyebrow">Mesa {table.tableNumber}</p>
                      <h3>{table.capacity} plazas</h3>
                      <p className="muted">ID: {table.id.slice(0, 8)}</p>
                      <p className="muted">{table.layoutLabel ?? 'Sin sector'}</p>
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
                  <p className="muted">Posición: ({selectedTable.posX ?? 0}, {selectedTable.posY ?? 0})</p>
                  <p className="muted">Sector: {selectedTable.layoutLabel ?? 'Sin sector'}</p>
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
                      <th>Posición</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tablesState.data.length ? (
                      tablesState.data.map((table) => (
                        <tr key={table.id}>
                          <td className="subtle">{table.id}</td>
                          <td>{table.tableNumber}</td>
                          <td>{table.capacity}</td>
                          <td>{table.posX ?? 0}, {table.posY ?? 0}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4}>Sin mesas para mostrar.</td>
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
                    onChange={(event) => setReportFilters({ ...reportFilters, date: event.target.value })}
                  />
                </label>

                <label>
                  Días para comparativo
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={reportFilters.days}
                    onChange={(event) => setReportFilters({ ...reportFilters, days: event.target.value })}
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
                    onChange={(event) => setReportFilters({ ...reportFilters, minVisits: event.target.value })}
                  />
                </label>

                <label>
                  Límite de clientes frecuentes
                  <input
                    type="number"
                    min={1}
                    value={reportFilters.limit}
                    onChange={(event) => setReportFilters({ ...reportFilters, limit: event.target.value })}
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

          <article className="panel report-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Reportes</p>
                <h3>Reportes generados</h3>
              </div>
              <button type="button" className="button button-secondary" onClick={loadSnapshots}>
                Actualizar
              </button>
            </div>

            <StatusMessage status={snapshotsState.status} message={snapshotsState.message} />
            <StatusMessage status={snapshotsActionState.status} message={snapshotsActionState.message} />

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Reservas</th>
                    <th>Asistencias</th>
                    <th>% asistencia</th>
                    <th>Origen</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshotsState.data.length ? (
                    snapshotsState.data.map((snapshot) => (
                      <tr key={snapshot.id}>
                        <td>{snapshot.reportDate}</td>
                        <td>{snapshot.reservationsCount}</td>
                        <td>{snapshot.attendedCount}</td>
                        <td>{formatPercent(snapshot.attendancePercent)}</td>
                        <td>{snapshot.source}</td>
                        <td>
                          <button
                            type="button"
                            className="button button-ghost button-tight"
                            onClick={() => handleDeleteSnapshot(snapshot)}
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6}>No hay reportes generados todavía.</td>
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
