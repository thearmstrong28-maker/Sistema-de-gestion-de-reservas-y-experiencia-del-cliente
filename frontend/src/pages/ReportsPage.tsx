import { useRef, useState, type FormEvent } from 'react'
import { api, getApiErrorMessage } from '../api/http'
import type {
  DailyOccupancyRow,
  DailyOccupancyQuery,
  FrequentCustomerRow,
  FrequentCustomersQuery,
} from '../api/types'
import { StatusMessage } from '../components/StatusMessage'
import { formatDate, formatDateTime, formatPercent } from '../lib/format'

type Status = 'idle' | 'loading' | 'success' | 'error'

interface ActionState<T> {
  status: Status
  message: string
  data: T | null
  updatedAt: string | null
}

const emptyOccupancy = { date: '', shiftId: '' }
const emptyFrequent = { minVisits: '2', limit: '20' }

export function ReportsPage() {
  const occupancyPanelRef = useRef<HTMLFormElement>(null)
  const frequentPanelRef = useRef<HTMLFormElement>(null)
  const [selectedReport, setSelectedReport] = useState<'occupancy' | 'frequent'>('occupancy')
  const [occupancyForm, setOccupancyForm] = useState(emptyOccupancy)
  const [frequentForm, setFrequentForm] = useState(emptyFrequent)
  const [occupancyState, setOccupancyState] = useState<ActionState<DailyOccupancyRow[]>>({
    status: 'idle',
    message: '',
    data: null,
    updatedAt: null,
  })
  const [frequentState, setFrequentState] = useState<ActionState<FrequentCustomerRow[]>>({
    status: 'idle',
    message: '',
    data: null,
    updatedAt: null,
  })

  const statusLabel: Record<Status, string> = {
    idle: 'Sin consultar',
    loading: 'Actualizando',
    success: 'Disponible',
    error: 'Con error',
  }

  const scrollToReport = (report: 'occupancy' | 'frequent') => {
    setSelectedReport(report)
    const target = report === 'occupancy' ? occupancyPanelRef.current : frequentPanelRef.current
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const loadOccupancy = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSelectedReport('occupancy')
    setOccupancyState((previous) => ({
      status: 'loading',
      message: 'Cargando ocupación...',
      data: null,
      updatedAt: previous.updatedAt,
    }))

    try {
      const payload: DailyOccupancyQuery = {
        date: occupancyForm.date || undefined,
        shiftId: occupancyForm.shiftId.trim() || undefined,
      }
      const { data } = await api.get<DailyOccupancyRow[]>('/reports/daily-occupancy', {
        params: payload,
      })
      setOccupancyState({
        status: 'success',
        message: 'Reporte listo.',
        data,
        updatedAt: new Date().toISOString(),
      })
    } catch (error) {
      setOccupancyState((previous) => ({
        status: 'error',
        message: getApiErrorMessage(error),
        data: null,
        updatedAt: previous.updatedAt,
      }))
    }
  }

  const loadFrequentCustomers = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSelectedReport('frequent')
    setFrequentState((previous) => ({
      status: 'loading',
      message: 'Cargando clientes frecuentes...',
      data: null,
      updatedAt: previous.updatedAt,
    }))

    try {
      const payload: FrequentCustomersQuery = {
        minVisits: Number(frequentForm.minVisits),
        limit: Number(frequentForm.limit),
      }
      const { data } = await api.get<FrequentCustomerRow[]>('/reports/frequent-customers', {
        params: payload,
      })
      setFrequentState({
        status: 'success',
        message: 'Listado listo.',
        data,
        updatedAt: new Date().toISOString(),
      })
    } catch (error) {
      setFrequentState((previous) => ({
        status: 'error',
        message: getApiErrorMessage(error),
        data: null,
        updatedAt: previous.updatedAt,
      }))
    }
  }

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Ocupación y clientes frecuentes</p>
          <h2>Reportes</h2>
        </div>
        <p className="muted">Ocupación diaria y clientes frecuentes con lectura rápida.</p>
      </div>

      <div className="reports-overview-grid">
        <article
          className={`panel report-summary-card ${selectedReport === 'frequent' ? 'report-summary-card-active' : ''}`}
        >
          <h3>Reporte de clientes frecuentes</h3>
          <p className="subtle">Listado de clientes con mayor recurrencia y seguimiento de ausencias.</p>
          <div className="report-summary-meta">
            <span>
              <strong>{frequentState.data?.length ?? 0}</strong> registros
            </span>
            <span>Estado: {statusLabel[frequentState.status]}</span>
            <span>
              Última actualización:{' '}
              {frequentState.updatedAt ? formatDateTime(frequentState.updatedAt) : 'Sin actualizaciones'}
            </span>
          </div>
          <button
            type="button"
            className="button button-secondary button-tight"
            onClick={() => scrollToReport('frequent')}
          >
            Ver contenido
          </button>
        </article>

        <article
          className={`panel report-summary-card ${selectedReport === 'occupancy' ? 'report-summary-card-active' : ''}`}
        >
          <h3>Reporte de ocupación diaria</h3>
          <p className="subtle">Resumen de mesas ocupadas, capacidad total y porcentaje de ocupación.</p>
          <div className="report-summary-meta">
            <span>
              <strong>{occupancyState.data?.length ?? 0}</strong> registros
            </span>
            <span>Estado: {statusLabel[occupancyState.status]}</span>
            <span>
              Última actualización:{' '}
              {occupancyState.updatedAt
                ? formatDateTime(occupancyState.updatedAt)
                : 'Sin actualizaciones'}
            </span>
          </div>
          <button
            type="button"
            className="button button-primary button-tight"
            onClick={() => scrollToReport('occupancy')}
          >
            Ver contenido
          </button>
        </article>
      </div>

      <div className="two-column-grid">
        <form
          ref={occupancyPanelRef}
          className={`panel form-panel ${selectedReport === 'occupancy' ? 'report-panel-focused' : ''}`}
          onSubmit={loadOccupancy}
        >
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
          <StatusMessage
            status={occupancyState.status}
            message={occupancyState.message}
          />

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
                {occupancyState.data?.length ? (
                  occupancyState.data.map((row) => (
                    <tr key={`${row.shiftId}-${row.shiftDate}`}>
                      <td>{row.shiftName}</td>
                      <td>{formatDate(row.shiftDate)}</td>
                      <td>{row.occupiedTables}/{row.totalTables}</td>
                      <td>{row.reservedGuests}/{row.totalCapacity}</td>
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

        <form
          ref={frequentPanelRef}
          className={`panel form-panel ${selectedReport === 'frequent' ? 'report-panel-focused' : ''}`}
          onSubmit={loadFrequentCustomers}
        >
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
                {frequentState.data?.length ? (
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
    </section>
  )
}
