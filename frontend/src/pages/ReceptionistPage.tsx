import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import axios from 'axios'
import {
  cancelReservation,
  createCustomer,
  createReservation,
  listCustomers,
  listReservations,
  listShifts,
  listWaitlist,
  listTablesLayout,
  markReservationNoShow,
  updateReservation,
} from '../api/receptionist'
import type { Customer, RestaurantTable, Reservation, Shift, WaitlistEntry } from '../api/types'
import { getApiErrorMessage } from '../api/http'
import { StatusMessage } from '../components/StatusMessage'
import { TableLayoutStage } from '../components/TableLayoutStage'
import {
  formatDate,
  formatDateTime,
  toIsoFromDateAndTime,
  toDateInputValue,
  toTimeInputValue,
} from '../lib/format'
import { formatReservationStatus, formatTableAvailabilityStatus, formatTableIdentifier, formatWaitlistStatus } from '../lib/labels'
import { buildLayoutBounds, getTableAvailabilityStatus, hydrateTablesLayout, type LayoutBounds } from '../lib/tableLayout'
import editIcon from '../assets/icon-edit.png'
import deleteIcon from '../assets/icon-delete.png'
import availabilityIcon from '../assets/icon-availability.png'

type Status = 'idle' | 'loading' | 'success' | 'error'
type ReceptionistTurn = 'matutino' | 'vespertino'

interface OperationState<T> {
  status: Status
  message: string
  data: T | null
}

interface ReservationFormState {
  customerName: string
  date: string
  time: string
  turn: ReceptionistTurn
  partySize: string
  specialRequests: string
}

interface CustomerFormState {
  fullName: string
  email: string
  phone: string
  preferences: string
}

const TODAY = toDateInputValue(new Date().toISOString())

const TURN_CONFIG: Record<ReceptionistTurn, { label: string; shiftName: string; defaultTime: string; window: string }> = {
  matutino: {
    label: 'Matutino',
    shiftName: 'breakfast',
    defaultTime: '09:00',
    window: '08:00 - 11:00',
  },
  vespertino: {
    label: 'Vespertino',
    shiftName: 'lunch',
    defaultTime: '13:00',
    window: '12:00 - 15:00',
  },
}

const TURN_LABELS: Record<ReceptionistTurn, string> = {
  matutino: 'Matutino',
  vespertino: 'Vespertino',
}

const resolveTurnFromShiftName = (shiftName?: string | null): ReceptionistTurn => {
  if (!shiftName) {
    return 'vespertino'
  }

  if (shiftName === 'breakfast' || shiftName.endsWith(':matutino')) {
    return 'matutino'
  }

  return 'vespertino'
}

const resolveTurnFromTime = (time: string): ReceptionistTurn => {
  const [hoursText, minutesText] = time.split(':')
  const hours = Number(hoursText)
  const minutes = Number(minutesText)

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 'matutino'
  }

  const totalMinutes = hours * 60 + minutes

  return totalMinutes >= 12 * 60 ? 'vespertino' : 'matutino'
}

const formatShiftLabel = (shiftName?: string | null): string => {
  if (!shiftName) {
    return 'Sin turno'
  }

  return TURN_LABELS[resolveTurnFromShiftName(shiftName)]
}

const emptyReservationForm = (): ReservationFormState => ({
  customerName: '',
  date: TODAY,
  time: TURN_CONFIG.matutino.defaultTime,
  turn: 'matutino',
  partySize: '2',
  specialRequests: '',
})

const emptyCustomerForm = (): CustomerFormState => ({
  fullName: '',
  email: '',
  phone: '',
  preferences: '',
})

const buildCustomerPreferences = (preferences: string): Record<string, unknown> | undefined => {
  const trimmedPreferences = preferences.trim()

  if (!trimmedPreferences) {
    return undefined
  }

  return { resumen: trimmedPreferences }
}

const buildReservationFormFromItem = (
  reservation: Reservation,
  customers: Customer[],
): ReservationFormState => {
  const time = toTimeInputValue(reservation.startsAt)
  const customerName =
    reservation.customer?.fullName ?? customers.find((customer) => customer.id === reservation.customerId)?.fullName ?? ''

  return {
    customerName,
    date: toDateInputValue(reservation.startsAt),
    time: time || TURN_CONFIG.matutino.defaultTime,
    turn: reservation.shift?.shiftName
      ? resolveTurnFromShiftName(reservation.shift.shiftName)
      : resolveTurnFromTime(time),
    partySize: String(reservation.partySize),
    specialRequests: reservation.specialRequests ?? '',
  }
}

export function ReceptionistPage() {
  const [activeTab, setActiveTab] = useState<'reservas' | 'cliente'>('reservas')
  const [reservationForm, setReservationForm] = useState(emptyReservationForm)
  const [editingReservationId, setEditingReservationId] = useState<string | null>(null)
  const [customerForm, setCustomerForm] = useState(emptyCustomerForm)
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [viewDate, setViewDate] = useState(TODAY)
  const [, setShifts] = useState<Shift[]>([])
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [tablesState, setTablesState] = useState<OperationState<RestaurantTable[]>>({
    status: 'idle',
    message: '',
    data: [],
  })
  const [selectedTableId, setSelectedTableId] = useState('')
  const [tableCoordinateBounds, setTableCoordinateBounds] = useState<LayoutBounds>(buildLayoutBounds([]))
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([])
  const [reservationState, setReservationState] = useState<OperationState<Reservation | null>>({
    status: 'idle',
    message: '',
    data: null,
  })
  const [customerState, setCustomerState] = useState<OperationState<Customer | null>>({
    status: 'idle',
    message: '',
    data: null,
  })
  const [, setCatalogState] = useState<OperationState<null>>({
    status: 'idle',
    message: '',
    data: null,
  })
  const [searchState, setSearchState] = useState<OperationState<Customer[]>>({
    status: 'idle',
    message: '',
    data: null,
  })
  const turnHint = useMemo(() => TURN_CONFIG[reservationForm.turn], [reservationForm.turn])
  const visibleTableIdentifierById = useMemo(() => {
    const sortedTables = [...tables].sort((left, right) => {
      if (left.tableNumber !== right.tableNumber) {
        return left.tableNumber - right.tableNumber
      }

      return left.id.localeCompare(right.id)
    })

    return new Map(sortedTables.map((table, index) => [table.id, formatTableIdentifier(index + 1)]))
  }, [tables])
  const getVisibleTableIdentifier = useCallback(
    (table: Pick<RestaurantTable, 'id' | 'tableNumber'>) =>
      visibleTableIdentifierById.get(table.id) ?? formatTableIdentifier(table.tableNumber),
    [visibleTableIdentifierById],
  )
  const selectedTable = useMemo(
    () => tables.find((table) => table.id === selectedTableId) ?? tables[0] ?? null,
    [selectedTableId, tables],
  )

  const resetReservationForm = useCallback(() => {
    setEditingReservationId(null)
    setReservationForm(emptyReservationForm())
  }, [])

  const startReservationEdit = useCallback(
    (reservation: Reservation) => {
      setEditingReservationId(reservation.id)
      setReservationForm(buildReservationFormFromItem(reservation, customers))
    },
    [customers],
  )

  const refreshCatalog = useCallback(async () => {
    setCatalogState({ status: 'loading', message: 'Cargando catalogo...', data: null })

    try {
      const [shiftData, customerData] = await Promise.all([listShifts(), listCustomers()])
      setShifts(shiftData)
      setCustomers(customerData)
      setCustomerResults(customerData)
      setCatalogState({ status: 'success', message: 'Catalogo actualizado.', data: null })
    } catch (error) {
      setCatalogState({ status: 'error', message: getApiErrorMessage(error), data: null })
    }
  }, [])

  const refreshDailyData = useCallback(async (date: string) => {
    try {
      const [reservationData, waitlistData] = await Promise.all([
        listReservations({ date }),
        listWaitlist({ date }),
      ])
      setReservations(reservationData)
      setWaitlist(waitlistData)
    } catch (error) {
      setCatalogState({ status: 'error', message: getApiErrorMessage(error), data: null })
    }
  }, [])

  const handleReservationAction = useCallback(
    async (reservationId: string, action: 'cancel' | 'no-show') => {
      setReservationState({
        status: 'loading',
        message: action === 'cancel' ? 'Cancelando reserva...' : 'Marcando no-show...',
        data: null,
      })

      try {
        const updatedReservation =
          action === 'cancel' ? await cancelReservation(reservationId) : await markReservationNoShow(reservationId)

        setReservationState({
          status: 'success',
          message: action === 'cancel' ? 'Reserva cancelada.' : 'No-show registrado.',
          data: updatedReservation,
        })

        if (editingReservationId === reservationId) {
          resetReservationForm()
        }

        await refreshDailyData(viewDate)
      } catch (error) {
        setReservationState({ status: 'error', message: getApiErrorMessage(error), data: null })
      }
    },
    [editingReservationId, refreshDailyData, resetReservationForm, viewDate],
  )

  const refreshTables = useCallback(async () => {
    setTablesState({ status: 'loading', message: 'Cargando maqueta de mesas...', data: [] })

    try {
      const backendTables = await listTablesLayout()
      const activeTables = hydrateTablesLayout(backendTables.filter((table) => table.isActive))

      setTables(activeTables)
      setTableCoordinateBounds(buildLayoutBounds(activeTables))
      setSelectedTableId((current) =>
        current && activeTables.some((table) => table.id === current) ? current : activeTables[0]?.id ?? '',
      )
      setTablesState({ status: 'success', message: 'Maqueta de mesas lista.', data: activeTables })
    } catch (error) {
      setTables([])
      setTableCoordinateBounds(buildLayoutBounds([]))
      setSelectedTableId('')
      setTablesState({ status: 'error', message: getApiErrorMessage(error), data: [] })
    }
  }, [])

  useEffect(() => {
    const loadCatalog = async () => {
      await refreshCatalog()
    }

    void loadCatalog()
  }, [refreshCatalog])

  useEffect(() => {
    const loadDailyData = async () => {
      await refreshDailyData(viewDate)
    }

    void loadDailyData()
  }, [refreshDailyData, viewDate])

  useEffect(() => {
    const loadTables = async () => {
      await refreshTables()
    }

    void loadTables()
  }, [refreshTables])

  const handleReservationSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setReservationState({
      status: 'loading',
      message: editingReservationId ? 'Actualizando reserva...' : 'Creando reserva...',
      data: null,
    })

    const customerName = reservationForm.customerName.trim()
    const matchedCustomer = customers.find(
      (customer) => customer.fullName.trim().toLowerCase() === customerName.toLowerCase(),
    )

    if (!matchedCustomer) {
      setReservationState({
        status: 'error',
        message: 'Selecciona un cliente existente para guardar la reserva.',
        data: null,
      })
      return
    }

    const startsAt = toIsoFromDateAndTime(reservationForm.date, reservationForm.time)
    if (!startsAt) {
      setReservationState({ status: 'error', message: 'Ingresa fecha y hora validas.', data: null })
      return
    }

    const partySize = Number(reservationForm.partySize)
    if (!Number.isFinite(partySize) || partySize < 1) {
      setReservationState({ status: 'error', message: 'Ingresa una cantidad valida de personas.', data: null })
      return
    }

    try {
      const payload = {
        customerId: matchedCustomer.id,
        turno: reservationForm.turn,
        partySize,
        startsAt,
        ...(reservationForm.specialRequests.trim()
          ? { specialRequests: reservationForm.specialRequests.trim() }
          : {}),
      }

      const savedReservation = editingReservationId
        ? await updateReservation(editingReservationId, payload)
        : await createReservation(payload)

      setReservationState({
        status: 'success',
        message: editingReservationId ? 'Reserva actualizada correctamente.' : 'Reserva creada correctamente.',
        data: savedReservation,
      })
      resetReservationForm()

      if (viewDate === reservationForm.date) {
        await refreshDailyData(viewDate)
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setReservationState({
          status: 'success',
          message:
            'Sin disponibilidad para la reserva. Se mantiene la regla de lista de espera automatica por conflicto.',
          data: null,
        })
        if (viewDate === reservationForm.date) {
          await refreshDailyData(viewDate)
        }
        return
      }

      setReservationState({ status: 'error', message: getApiErrorMessage(error), data: null })
    }
  }

  const handleCustomerSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCustomerState({ status: 'loading', message: 'Registrando cliente...', data: null })

    try {
      const preferences = buildCustomerPreferences(customerForm.preferences)
      const createdCustomer = await createCustomer({
        fullName: customerForm.fullName.trim(),
        email: customerForm.email.trim() || undefined,
        phone: customerForm.phone.trim() || undefined,
        ...(preferences ? { preferences } : {}),
      })

      setCustomerState({
        status: 'success',
        message: 'Cliente registrado correctamente.',
        data: createdCustomer,
      })
      setCustomerForm(emptyCustomerForm())
      await refreshCatalog()
    } catch (error) {
      setCustomerState({ status: 'error', message: getApiErrorMessage(error), data: null })
    }
  }

  const handleCustomerSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSearchState({ status: 'loading', message: 'Buscando clientes...', data: null })

    try {
      const foundCustomers = await listCustomers(customerSearchQuery)
      setCustomerResults(foundCustomers)
      setSearchState({
        status: 'success',
        message: foundCustomers.length
          ? `${foundCustomers.length} cliente(s) encontrado(s).`
          : 'No se encontraron clientes.',
        data: foundCustomers,
      })
    } catch (error) {
      setSearchState({ status: 'error', message: getApiErrorMessage(error), data: null })
    }
  }

  const handleCustomerSearchReset = async () => {
    setCustomerSearchQuery('')
    setSearchState({ status: 'loading', message: 'Recargando clientes...', data: null })

    try {
      const allCustomers = await listCustomers()
      setCustomers(allCustomers)
      setCustomerResults(allCustomers)
      setSearchState({ status: 'success', message: 'Listado completo actualizado.', data: allCustomers })
    } catch (error) {
      setSearchState({ status: 'error', message: getApiErrorMessage(error), data: null })
    }
  }

  return (
    <section className="page-stack fade-in">
      <div className="page-header">
        <div>
          <p className="eyebrow">Operacion diaria de recepcion</p>
          <h2>Recepcion</h2>
        </div>
        <p className="muted">Reservas, clientes y lista de espera en una sola vista.</p>
      </div>

      <article className="panel form-panel tables-showcase-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Mesas</p>
            <h3>Maqueta visual del salon</h3>
          </div>
          <span className="chip">Solo lectura</span>
        </div>

        <StatusMessage status={tablesState.status} message={tablesState.message} />

        <div className="tables-stage-meta">
          <p className="muted">Vista de referencia para consultar la distribucion y el estado actual de cada mesa.</p>
          <p className="subtle">No permite mover, editar ni cambiar la disponibilidad desde esta pantalla.</p>
        </div>

        <div className="tables-status-legend" aria-label="Leyenda de estado de mesas">
          <span className="tables-legend-item">
            <span className="tables-legend-dot tables-legend-dot-disponible" aria-hidden="true" />
            Disponible
          </span>
          <span className="tables-legend-item">
            <span className="tables-legend-dot tables-legend-dot-ocupada" aria-hidden="true" />
            Ocupada
          </span>
        </div>

        <TableLayoutStage
          tables={tables}
          bounds={tableCoordinateBounds}
          selectedTableId={selectedTable?.id ?? ''}
          readOnly
          getTableLabel={getVisibleTableIdentifier}
          onSelectTable={(tableId) => setSelectedTableId(tableId)}
        />

        {selectedTable ? (
          <div className="selected-table-card">
            <p className="eyebrow">{getVisibleTableIdentifier(selectedTable)}</p>
            <h3>{selectedTable.capacity} plazas</h3>
            <p className="muted">Categoria: {selectedTable.category ?? 'Normal'}</p>
            <p className="muted">Estado: {formatTableAvailabilityStatus(getTableAvailabilityStatus(selectedTable))}</p>
          </div>
        ) : null}
      </article>

      <div className="tabbar receptionist-tabs" role="tablist" aria-label="Vistas de recepcion">
        <button
          type="button"
          className={`tab ${activeTab === 'reservas' ? 'tab-active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'reservas'}
          onClick={() => setActiveTab('reservas')}
        >
          Reservas
        </button>
        <button
          type="button"
          className={`tab ${activeTab === 'cliente' ? 'tab-active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'cliente'}
          onClick={() => setActiveTab('cliente')}
        >
          Cliente
        </button>
      </div>

      {activeTab === 'reservas' ? (
        <div className="receptionist-reservations-grid">
          <form
            className="panel form-panel receptionist-reservations-panel receptionist-reservations-card-create"
            onSubmit={handleReservationSubmit}
          >
            <h3>Crear reserva</h3>
            <p className="form-hint">
              Matutino usa el turno <code>breakfast</code> y vespertino usa <code>lunch</code>.
            </p>

            <label>
              Nombre del cliente
              <input
                value={reservationForm.customerName}
                onChange={(event) =>
                  setReservationForm({ ...reservationForm, customerName: event.target.value })
                }
                list="customer-names"
                required
              />
            </label>

            <div className="form-grid">
              <label>
                Fecha
                <input
                  type="date"
                  value={reservationForm.date}
                  min={TODAY}
                  onChange={(event) =>
                    setReservationForm({ ...reservationForm, date: event.target.value })
                  }
                  required
                />
              </label>
              <label>
                Hora
                <input
                  type="time"
                  value={reservationForm.time}
                  onChange={(event) => {
                    const nextTime = event.target.value

                    setReservationForm({
                      ...reservationForm,
                      time: nextTime,
                      turn: nextTime ? resolveTurnFromTime(nextTime) : reservationForm.turn,
                    })
                  }}
                  required
                />
              </label>
            </div>

            <div className="form-grid">
              <label>
                Turno
                <select
                  value={reservationForm.turn}
                  onChange={(event) => {
                    const nextTurn = event.target.value as ReceptionistTurn
                    setReservationForm({
                      ...reservationForm,
                      turn: nextTurn,
                      time:
                        reservationForm.time === TURN_CONFIG[reservationForm.turn].defaultTime ||
                        !reservationForm.time
                          ? TURN_CONFIG[nextTurn].defaultTime
                          : reservationForm.time,
                    })
                  }}
                >
                  <option value="matutino">Matutino</option>
                  <option value="vespertino">Vespertino</option>
                </select>
              </label>
              <label>
                Numero de personas
                <input
                  type="number"
                  min={1}
                  value={reservationForm.partySize}
                  onChange={(event) =>
                    setReservationForm({ ...reservationForm, partySize: event.target.value })
                  }
                  required
                />
              </label>
            </div>

            <p className="form-hint">
              Turno activo: <strong>{turnHint.label}</strong> ({turnHint.window}).
            </p>

            <label>
              Solicitudes especiales
              <textarea
                rows={3}
                value={reservationForm.specialRequests}
                onChange={(event) =>
                  setReservationForm({ ...reservationForm, specialRequests: event.target.value })
                }
              />
            </label>

            {editingReservationId ? (
              <p className="form-hint">Editando reserva {editingReservationId}</p>
            ) : null}

            <div className="button-row">
              <button type="submit" className="button button-primary">
                {editingReservationId ? 'Guardar cambios' : 'Crear reserva'}
              </button>
              {editingReservationId ? (
                <button type="button" className="button button-secondary" onClick={resetReservationForm}>
                  Cancelar edición
                </button>
              ) : null}
            </div>
            <StatusMessage status={reservationState.status} message={reservationState.message} />
          </form>

          <article className="panel form-panel receptionist-reservations-panel receptionist-reservations-card-waitlist">
            <div className="panel-heading">
              <h3>Lista de espera</h3>
              <span className="chip">{formatDate(viewDate)}</span>
            </div>

            <p className="form-hint">
              Visualizacion de entradas generadas automaticamente por conflictos de disponibilidad (409).
            </p>

            <div className="history-list receptionist-scroll-list receptionist-waitlist-list receptionist-waitlist-scroll">
              {waitlist.length ? (
                waitlist.map((entry) => (
                  <article key={entry.id} className="history-item">
                    <div>
                      <strong>{entry.customer?.fullName ?? 'Cliente sin cargar'}</strong>
                      <p>
                        {formatDate(entry.requestedDate)} · Posicion {entry.position ?? '—'}
                      </p>
                      <p className="subtle">
                        {formatShiftLabel(entry.requestedShift?.shiftName)} ·{' '}
                        {formatWaitlistStatus(entry.status)}
                      </p>
                    </div>
                  </article>
                ))
              ) : (
                <p className="muted">No hay entradas para este dia.</p>
              )}
            </div>
          </article>

          <article className="panel form-panel receptionist-reservations-panel receptionist-reservations-card-upcoming">
            <div className="panel-heading">
              <h3>Reservas del dia y futuras</h3>
              <span className="chip">{formatDate(viewDate)}</span>
            </div>

            <label>
              Ver dia
              <input
                type="date"
                value={viewDate}
                min={TODAY}
                onChange={(event) => setViewDate(event.target.value)}
              />
            </label>

            <div className="history-list receptionist-scroll-list receptionist-future-reservations-list receptionist-upcoming-scroll">
              {reservations.length ? (
                reservations.map((reservation) => (
                  <article key={reservation.id} className="history-item receptionist-reservation-item">
                    <div>
                      <strong>{reservation.customer?.fullName ?? 'Cliente sin cargar'}</strong>
                      <p>
                        {formatDateTime(reservation.startsAt)} ·{' '}
                        {formatShiftLabel(reservation.shift?.shiftName)} · {reservation.partySize}{' '}
                        personas
                      </p>
                      <p className="subtle">
                        Mesa {reservation.table?.tableNumber ? `M${reservation.table.tableNumber}` : '—'} ·{' '}
                        {formatReservationStatus(reservation.status)}
                      </p>
                    </div>
                    <div className="history-item-actions">
                      <button
                        type="button"
                        className="button button-secondary button-icon button-icon-edit"
                        onClick={() => startReservationEdit(reservation)}
                        aria-label="Editar reserva"
                        title="Editar reserva"
                      >
                        <img className="button-icon-image" src={editIcon} alt="" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="button button-ghost button-icon button-icon-delete"
                        onClick={() => void handleReservationAction(reservation.id, 'cancel')}
                        aria-label="Cancelar reserva"
                        title="Cancelar reserva"
                      >
                        <img className="button-icon-image" src={deleteIcon} alt="" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="button button-secondary button-icon button-icon-no-show"
                        onClick={() => void handleReservationAction(reservation.id, 'no-show')}
                        aria-label="Registrar no-show"
                        title="Registrar no-show"
                      >
                        <img className="button-icon-image" src={availabilityIcon} alt="" aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <p className="muted">No hay reservas cargadas para este dia.</p>
              )}
            </div>
          </article>
        </div>
      ) : (
        <div className="two-column-grid">
          <form className="panel form-panel receptionist-client-panel receptionist-client-panel-register" onSubmit={handleCustomerSubmit}>
            <h3>Registrar cliente</h3>
            <label>
              Nombre completo
              <input
                value={customerForm.fullName}
                onChange={(event) =>
                  setCustomerForm({ ...customerForm, fullName: event.target.value })
                }
                required
              />
            </label>

            <div className="form-grid">
              <label>
                Correo electronico
                <input
                  type="email"
                  value={customerForm.email}
                  onChange={(event) =>
                    setCustomerForm({ ...customerForm, email: event.target.value })
                  }
                />
              </label>
              <label>
                Telefono
                <input
                  value={customerForm.phone}
                  onChange={(event) =>
                    setCustomerForm({ ...customerForm, phone: event.target.value })
                  }
                />
              </label>
            </div>

            <label>
              Preferencias
              <textarea
                rows={4}
                placeholder="Ej: Prefiere mesa junto a ventana"
                value={customerForm.preferences}
                onChange={(event) =>
                  setCustomerForm({ ...customerForm, preferences: event.target.value })
                }
              />
            </label>

            <button type="submit" className="button button-primary">
              Registrar cliente
            </button>
            <StatusMessage status={customerState.status} message={customerState.message} />
          </form>

          <article className="panel form-panel receptionist-client-panel receptionist-client-panel-search">
            <h3>Buscar clientes</h3>
            <form className="form-panel receptionist-search-form" onSubmit={handleCustomerSearch}>
              <label>
                Buscar por nombre o telefono
                <input
                  value={customerSearchQuery}
                  onChange={(event) => setCustomerSearchQuery(event.target.value)}
                  placeholder="Ej: Ana o 11 5555 5555"
                />
              </label>

              <div className="button-row receptionist-search-actions">
                <button type="submit" className="button button-primary">
                  Buscar
                </button>
                <button type="button" className="button button-secondary" onClick={handleCustomerSearchReset}>
                  Limpiar
                </button>
              </div>
            </form>

            <StatusMessage status={searchState.status} message={searchState.message} />

            <div className="history-list receptionist-search-results">
              {customerResults.length ? (
                customerResults.map((customer) => (
                  <article key={customer.id} className="history-item">
                    <strong>{customer.fullName}</strong>
                    <p>Telefono: {customer.phone?.trim() || 'Sin telefono'}</p>
                  </article>
                ))
              ) : (
                <p className="muted">No hay clientes para mostrar.</p>
              )}
            </div>
          </article>
        </div>
      )}

      <datalist id="customer-names">
        {customers.map((customer) => (
          <option key={customer.id} value={customer.fullName} />
        ))}
      </datalist>

    </section>
  )
}
