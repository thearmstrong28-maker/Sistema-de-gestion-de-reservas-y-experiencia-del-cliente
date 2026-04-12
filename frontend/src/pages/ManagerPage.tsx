import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  fetchDailyReportComparison,
  fetchDailyReportSummary,
  fetchFrequentCustomers,
  listCustomersWithMetrics,
  listShifts,
  listReportSnapshots,
  listReservationsByDate,
  updateCustomer,
} from '../api/manager'
import type {
  CustomerWithMetrics,
  DailyComparisonRow,
  DailyReportSummary,
  FrequentCustomerRow,
  ReportSnapshot,
  Reservation,
  Shift,
} from '../api/types'
import { StatusMessage } from '../components/StatusMessage'
import { formatDate, formatDateTime, formatPercent } from '../lib/format'

type ManagerTab = 'clientes' | 'historial' | 'reportes'
type Status = 'idle' | 'loading' | 'success' | 'error'

interface ResultState<T> {
  status: Status
  message: string
  data: T
}

interface CustomerEditForm {
  fullName: string
  email: string
  phone: string
  notes: string
}

interface ReportFilters {
  date: string
  shiftId: string
  days: string
  minVisits: string
  limit: string
}

const managerTabs: Array<{ id: ManagerTab; label: string; description: string }> = [
  { id: 'clientes', label: 'Clientes', description: 'Listado, edición y métricas de asistencia.' },
  { id: 'historial', label: 'Historial por día', description: 'Seguimiento de reservas y estado por fecha.' },
  { id: 'reportes', label: 'Reportes', description: 'Resumen automático del día en modo solo lectura.' },
]

const today = new Date().toISOString().slice(0, 10)

const initialReportFilters: ReportFilters = {
  date: today,
  shiftId: '',
  days: '7',
  minVisits: '2',
  limit: '8',
}

const parsePositiveInteger = (value: string, fallback: number): number => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback
  }
  return Math.trunc(parsed)
}

const formatReservationStatus = (status: Reservation['status']): string => {
  const labels: Record<Reservation['status'], string> = {
    PENDING: 'Pendiente',
    CONFIRMED: 'Confirmada',
    CANCELLED: 'Cancelada por cliente',
    NO_SHOW: 'No-show',
    SEATED: 'Sentado',
    COMPLETED: 'Completada',
  }
  return labels[status]
}

const formatCancellationSummary = (reservation: Reservation): string | null => {
  if (reservation.status !== 'CANCELLED') {
    return null
  }

  const reason = reservation.cancellationReason?.trim() || 'Sin motivo especificado'

  return `Cancelada el ${formatDateTime(reservation.updatedAt)} · Motivo: ${reason}`
}

export function ManagerPage() {
  const [activeTab, setActiveTab] = useState<ManagerTab>('clientes')
  const [searchQuery, setSearchQuery] = useState('')
  const [historyDate, setHistoryDate] = useState(today)
  const [reportFilters, setReportFilters] = useState<ReportFilters>(initialReportFilters)
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null)
  const [customerEditForm, setCustomerEditForm] = useState<CustomerEditForm>({
    fullName: '',
    email: '',
    phone: '',
    notes: '',
  })

  const [customersState, setCustomersState] = useState<ResultState<CustomerWithMetrics[]>>({
    status: 'idle',
    message: '',
    data: [],
  })
  const [customerActionState, setCustomerActionState] = useState<{ status: Status; message: string }>({
    status: 'idle',
    message: '',
  })
  const [historyState, setHistoryState] = useState<ResultState<Reservation[]>>({
    status: 'idle',
    message: '',
    data: [],
  })

  const [dailySummaryState, setDailySummaryState] = useState<ResultState<DailyReportSummary | null>>({
    status: 'idle',
    message: '',
    data: null,
  })
  const [shifts, setShifts] = useState<Shift[]>([])
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

  const loadCustomers = async (query = '') => {
    setCustomersState((previous) => ({ ...previous, status: 'loading', message: 'Cargando clientes...' }))
    try {
      const data = await listCustomersWithMetrics(query)
      setCustomersState({
        status: 'success',
        message: data.length ? 'Clientes actualizados.' : 'No hay clientes para mostrar.',
        data,
      })
    } catch {
      setCustomersState((previous) => ({
        ...previous,
        status: 'error',
        message: 'No se pudo cargar el listado de clientes.',
      }))
    }
  }

  const loadHistory = async (date: string) => {
    setHistoryState((previous) => ({ ...previous, status: 'loading', message: 'Cargando historial...' }))
    try {
      const data = await listReservationsByDate(date)
      setHistoryState({
        status: 'success',
        message: data.length ? 'Historial actualizado.' : 'No hay reservas en esa fecha.',
        data,
      })
    } catch {
      setHistoryState((previous) => ({
        ...previous,
        status: 'error',
        message: 'No se pudo cargar el historial por día.',
      }))
    }
  }

  const loadReports = async (filters: ReportFilters) => {
    setDailySummaryState((previous) => ({ ...previous, status: 'loading', message: 'Cargando reportes...' }))
    setComparisonState((previous) => ({ ...previous, status: 'loading', message: 'Cargando comparativo...' }))
    setFrequentState((previous) => ({ ...previous, status: 'loading', message: 'Cargando clientes frecuentes...' }))
    setSnapshotsState((previous) => ({ ...previous, status: 'loading', message: 'Cargando reportes generados...' }))

    const days = parsePositiveInteger(filters.days, 7)
    const minVisits = parsePositiveInteger(filters.minVisits, 2)
    const limit = parsePositiveInteger(filters.limit, 8)

    const [summaryResult, comparisonResult, frequentResult, snapshotsResult] = await Promise.allSettled([
      fetchDailyReportSummary({ date: filters.date || undefined }),
      fetchDailyReportComparison({ date: filters.date || undefined, days }),
      fetchFrequentCustomers({
        date: filters.date || undefined,
        shiftId: filters.shiftId || undefined,
        minVisits,
        limit,
      }),
      listReportSnapshots(),
    ])

    if (summaryResult.status === 'fulfilled') {
      setDailySummaryState({ status: 'success', message: 'Resumen diario actualizado.', data: summaryResult.value })
    } else {
      setDailySummaryState({ status: 'error', message: 'No se pudo cargar el resumen diario.', data: null })
    }

    if (comparisonResult.status === 'fulfilled') {
      setComparisonState({ status: 'success', message: 'Comparativo actualizado.', data: comparisonResult.value })
    } else {
      setComparisonState({ status: 'error', message: 'No se pudo cargar el comparativo.', data: [] })
    }

    if (frequentResult.status === 'fulfilled') {
      setFrequentState({ status: 'success', message: 'Clientes frecuentes actualizados.', data: frequentResult.value })
    } else {
      setFrequentState({ status: 'error', message: 'No se pudo cargar clientes frecuentes.', data: [] })
    }

    if (snapshotsResult.status === 'fulfilled') {
      setSnapshotsState({ status: 'success', message: 'Reportes generados actualizados.', data: snapshotsResult.value })
    } else {
      setSnapshotsState({ status: 'error', message: 'No se pudieron cargar los reportes generados.', data: [] })
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCustomers()
      void loadHistory(today)
      void loadReports(initialReportFilters)
    }, 0)

    void listShifts()
      .then((data) => setShifts(data))
      .catch(() => setShifts([]))

    return () => window.clearTimeout(timeoutId)
  }, [])

  const handleSearchCustomers = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void loadCustomers(searchQuery)
  }

  const handleHistorySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void loadHistory(historyDate)
  }

  const handleReportsSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void loadReports(reportFilters)
  }

  const startEditingCustomer = (customer: CustomerWithMetrics) => {
    setEditingCustomerId(customer.id)
    setCustomerEditForm({
      fullName: customer.fullName,
      email: customer.email ?? '',
      phone: customer.phone ?? '',
      notes: customer.notes ?? '',
    })
  }

  const cancelEditingCustomer = () => {
    setEditingCustomerId(null)
    setCustomerEditForm({ fullName: '', email: '', phone: '', notes: '' })
  }

  const handleUpdateCustomer = async (event: FormEvent<HTMLFormElement>, customerId: string) => {
    event.preventDefault()
    setCustomerActionState({ status: 'loading', message: 'Actualizando cliente...' })

    try {
      await updateCustomer(customerId, {
        fullName: customerEditForm.fullName.trim(),
        email: customerEditForm.email.trim() || undefined,
        phone: customerEditForm.phone.trim() || undefined,
        notes: customerEditForm.notes.trim() || undefined,
      })

      setCustomerActionState({ status: 'success', message: 'Cliente actualizado correctamente.' })
      setEditingCustomerId(null)
      await loadCustomers(searchQuery)
    } catch {
      setCustomerActionState({ status: 'error', message: 'No se pudo actualizar el cliente.' })
    }
  }

  const summaryCards = [
    { label: 'Reservas del día', value: dailySummaryState.data?.reservationsCount ?? 0 },
    { label: 'Asistencias', value: dailySummaryState.data?.attendedCount ?? 0 },
    { label: 'Clientes', value: dailySummaryState.data?.customerCount ?? 0 },
    { label: 'Sin asistencia', value: dailySummaryState.data?.noShowCount ?? 0 },
  ]

  const maxComparisonValue = useMemo(
    () => Math.max(1, ...comparisonState.data.map((row) => row.reservationsCount)),
    [comparisonState.data],
  )

  return (
    <section className="page-stack establishment-page fade-in">
      <article className="panel establishment-hero">
        <div className="establishment-hero-copy">
          <p className="eyebrow">Panel gerencial</p>
          <h2>Gerente</h2>
          <p className="lead">Seguimiento de clientes, historial diario y reportes automáticos.</p>
        </div>
      </article>

      <div className="admin-tabs" role="tablist" aria-label="Secciones de gerente">
        {managerTabs.map((tab) => (
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

      {activeTab === 'clientes' ? (
        <div className="stacked-panels">
          <article className="panel form-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Clientes</p>
                <h3>Listado y métricas</h3>
              </div>
            </div>

            <form className="form-panel" onSubmit={handleSearchCustomers}>
              <label>
                Buscar cliente
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Nombre, email o teléfono"
                />
              </label>
              <button type="submit" className="button button-primary">
                Buscar
              </button>
            </form>

            <StatusMessage status={customersState.status} message={customersState.message} />
            <StatusMessage status={customerActionState.status} message={customerActionState.message} />

            <div className="table-scroll users-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Reservas</th>
                    <th>Asistencias</th>
                    <th>Cancelaciones</th>
                    <th>No-show</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {customersState.data.length ? (
                    customersState.data.map((customer) => (
                      <tr key={customer.id}>
                        <td>
                          <strong>{customer.fullName}</strong>
                          <div className="subtle">{customer.email ?? customer.phone ?? customer.id}</div>
                        </td>
                        <td>{customer.reservationsCount}</td>
                        <td>{customer.attendedCount}</td>
                        <td>{customer.cancelledCount}</td>
                        <td>{customer.noShowCount}</td>
                        <td>
                          <button
                            type="button"
                            className="button button-secondary button-tight"
                            onClick={() => startEditingCustomer(customer)}
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6}>No hay clientes para mostrar.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>

          {editingCustomerId ? (
            <article className="panel form-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Clientes</p>
                  <h3>Editar información</h3>
                </div>
              </div>

              <form className="form-panel" onSubmit={(event) => void handleUpdateCustomer(event, editingCustomerId)}>
                <div className="form-grid">
                  <label>
                    Nombre
                    <input
                      value={customerEditForm.fullName}
                      onChange={(event) =>
                        setCustomerEditForm({ ...customerEditForm, fullName: event.target.value })
                      }
                      required
                    />
                  </label>
                  <label>
                    Email
                    <input
                      type="email"
                      value={customerEditForm.email}
                      onChange={(event) => setCustomerEditForm({ ...customerEditForm, email: event.target.value })}
                    />
                  </label>
                </div>

                <div className="form-grid">
                  <label>
                    Teléfono
                    <input
                      value={customerEditForm.phone}
                      onChange={(event) => setCustomerEditForm({ ...customerEditForm, phone: event.target.value })}
                    />
                  </label>
                  <label>
                    Notas
                    <input
                      value={customerEditForm.notes}
                      onChange={(event) => setCustomerEditForm({ ...customerEditForm, notes: event.target.value })}
                    />
                  </label>
                </div>

                <div className="button-row">
                  <button type="submit" className="button button-primary button-tight">
                    Guardar cambios
                  </button>
                  <button type="button" className="button button-ghost button-tight" onClick={cancelEditingCustomer}>
                    Cancelar
                  </button>
                </div>
              </form>
            </article>
          ) : null}
        </div>
      ) : null}

      {activeTab === 'historial' ? (
        <article className="panel form-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Historial</p>
              <h3>Reservas por fecha</h3>
            </div>
          </div>

          <form className="form-panel" onSubmit={handleHistorySubmit}>
            <label>
              Fecha
              <input type="date" value={historyDate} onChange={(event) => setHistoryDate(event.target.value)} />
            </label>
            <button type="submit" className="button button-primary">
              Consultar
            </button>
          </form>

          <StatusMessage status={historyState.status} message={historyState.message} />

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Horario</th>
                  <th>Cliente</th>
                  <th>Personas</th>
                  <th>Mesa</th>
                  <th>Estado</th>
                </tr>
              </thead>
                  <tbody>
                    {historyState.data.length ? (
                      historyState.data.map((reservation) => (
                        <tr key={reservation.id}>
                          <td>{formatDateTime(reservation.startsAt)}</td>
                          <td>{reservation.customer?.fullName ?? reservation.customerId}</td>
                          <td>{reservation.partySize}</td>
                          <td>{reservation.table?.tableNumber ? `M${reservation.table.tableNumber}` : '—'}</td>
                          <td>
                            <div>{formatReservationStatus(reservation.status)}</div>
                            {formatCancellationSummary(reservation) ? (
                              <div className="subtle">{formatCancellationSummary(reservation)}</div>
                            ) : null}
                          </td>
                        </tr>
                      ))
                ) : (
                  <tr>
                    <td colSpan={5}>Sin historial para la fecha seleccionada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
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

            <form className="form-panel" onSubmit={handleReportsSubmit}>
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
                  Turno para clientes frecuentes
                  <select
                    value={reportFilters.shiftId}
                    onChange={(event) =>
                      setReportFilters({ ...reportFilters, shiftId: event.target.value })
                    }
                  >
                    <option value="">Todos los turnos</option>
                    {shifts.map((shift) => (
                      <option key={shift.id} value={shift.id}>
                        {shift.shiftName}
                      </option>
                    ))}
                  </select>
                </label>

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
                        <td>{formatDate(row.reportDate)}</td>
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
              <button type="button" className="button button-secondary" onClick={() => void loadReports(reportFilters)}>
                Actualizar
              </button>
            </div>

            <StatusMessage status={snapshotsState.status} message={snapshotsState.message} />

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Reservas</th>
                    <th>Asistencias</th>
                    <th>% asistencia</th>
                    <th>Origen</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshotsState.data.length ? (
                    snapshotsState.data.map((snapshot) => (
                      <tr key={snapshot.id}>
                        <td>{formatDate(snapshot.reportDate)}</td>
                        <td>{snapshot.reservationsCount}</td>
                        <td>{snapshot.attendedCount}</td>
                        <td>{formatPercent(snapshot.attendancePercent)}</td>
                        <td>{snapshot.source}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5}>No hay reportes generados todavía.</td>
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
