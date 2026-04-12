import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import axios from 'axios'
import {
  createCustomer,
  cancelReservation,
  assignReservationTable,
  createReservation,
  listCustomers,
  listReservations,
  listShifts,
  listWaitlist,
  listTablesLayout,
  updateTableAvailability,
  updateReservation,
  updateReservationStatus,
} from '../api/receptionist'
import type {
  Customer,
  RestaurantTable,
  Reservation,
  ReservationStatus,
  Shift,
  TableAvailabilityStatus,
  WaitlistEntry,
} from '../api/types'
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
import sendIcon from '../assets/icon-send.svg'

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

const TURN_CONFIG: Record<ReceptionistTurn, { label: string; defaultTime: string; min: string; max: string }> = {
  matutino: {
    label: 'Matutino',
    defaultTime: '06:00',
    min: '06:00',
    max: '14:00',
  },
  vespertino: {
    label: 'Vespertino',
    defaultTime: '14:00',
    min: '14:00',
    max: '22:00',
  },
}

const TURN_LABELS: Record<ReceptionistTurn, string> = {
  matutino: 'Matutino',
  vespertino: 'Vespertino',
}

const FINAL_RESERVATION_STATUS_OPTIONS: Array<{ value: ReservationStatus; label: string }> = [
  { value: 'COMPLETED', label: 'Se presentó' },
  { value: 'CANCELLED', label: 'Cancelada por cliente' },
  { value: 'NO_SHOW', label: 'No asistió' },
]

const EDITABLE_RESERVATION_STATUSES: ReservationStatus[] = ['PENDING', 'CONFIRMED', 'SEATED']

const canEditReservation = (status: ReservationStatus): boolean =>
  EDITABLE_RESERVATION_STATUSES.includes(status)

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

  return totalMinutes >= 14 * 60 ? 'vespertino' : 'matutino'
}

const formatShiftTime = (value: string): string => value.slice(0, 5)

const formatShiftWindow = (startsAt: string, endsAt: string): string =>
  `${formatShiftTime(startsAt)} - ${formatShiftTime(endsAt)}`

const getTurnHint = (turn: ReceptionistTurn): { label: string; min: string; max: string; window: string } => {
  const config = TURN_CONFIG[turn]

  return {
    label: config.label,
    min: config.min,
    max: config.max,
    window: `${config.min} - ${config.max}`,
  }
}

const getShiftForReservationForm = (
  shifts: Shift[],
  date: string,
  turn: ReceptionistTurn,
): Shift | null => {
  const shiftsForDate = shifts.filter((shift) => shift.shiftDate === date)

  return shiftsForDate.find((shift) => resolveTurnFromShiftName(shift.shiftName) === turn) ?? null
}

const getShiftHint = (
  shifts: Shift[],
  date: string,
  turn: ReceptionistTurn,
): { label: string; min: string; max: string; window: string } => {
  const shift = getShiftForReservationForm(shifts, date, turn)

  if (!shift) {
    return getTurnHint(turn)
  }

  return {
    label: TURN_LABELS[resolveTurnFromShiftName(shift.shiftName)],
    min: formatShiftTime(shift.startsAt),
    max: formatShiftTime(shift.endsAt),
    window: formatShiftWindow(shift.startsAt, shift.endsAt),
  }
}

const toMinutes = (time: string): number => {
  const [hoursText, minutesText] = time.split(':')
  const hours = Number(hoursText)
  const minutes = Number(minutesText)

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return Number.NaN
  }

  return hours * 60 + minutes
}

const toTimeValue = (minutes: number): string => {
  const boundedMinutes = Math.max(0, Math.min(minutes, 23 * 60 + 59))
  const hours = Math.floor(boundedMinutes / 60)
  const mins = boundedMinutes % 60

  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

const getSuggestedReservationDateTime = (): { date: string; time: string; turn: ReceptionistTurn } => {
  const now = new Date()
  const date = toDateInputValue(now.toISOString())
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const roundedMinutes = Math.ceil(currentMinutes / 15) * 15

  if (roundedMinutes < 14 * 60) {
    const nextTime = toTimeValue(Math.max(6 * 60, roundedMinutes))
    return { date, time: nextTime, turn: 'matutino' }
  }

  if (roundedMinutes < 22 * 60) {
    const nextTime = toTimeValue(Math.max(14 * 60, roundedMinutes))
    return { date, time: nextTime, turn: 'vespertino' }
  }

  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  return {
    date: toDateInputValue(tomorrow.toISOString()),
    time: TURN_CONFIG.matutino.defaultTime,
    turn: 'matutino',
  }
}

const formatShiftLabel = (shiftName?: string | null): string => {
  if (!shiftName) {
    return 'Sin turno'
  }

  return TURN_LABELS[resolveTurnFromShiftName(shiftName)]
}

const emptyReservationForm = (): ReservationFormState => ({
  customerName: '',
  ...getSuggestedReservationDateTime(),
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
  const resolvedTime = time || TURN_CONFIG.matutino.defaultTime
  const customerName =
    reservation.customer?.fullName ?? customers.find((customer) => customer.id === reservation.customerId)?.fullName ?? ''

  return {
    customerName,
    date: reservation.reservationDate,
    time: resolvedTime,
    turn: resolveTurnFromTime(resolvedTime),
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
  const [shifts, setShifts] = useState<Shift[]>([])
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
  const [selectedFinalStatusByReservationId, setSelectedFinalStatusByReservationId] = useState<
    Record<string, ReservationStatus | ''>
  >({})
  const [cancellationReasonByReservationId, setCancellationReasonByReservationId] = useState<Record<string, string>>({})
  const [selectedTableForReservationById, setSelectedTableForReservationById] = useState<
    Record<string, string>
  >({})
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
  const turnHint = useMemo(
    () => getShiftHint(shifts, reservationForm.date, resolveTurnFromTime(reservationForm.time)),
    [reservationForm.date, reservationForm.time, shifts],
  )
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
  const activeReservations = useMemo(
    () => reservations.filter((reservation) => canEditReservation(reservation.status)),
    [reservations],
  )

  const sortedWaitlist = useMemo(
    () =>
      [...waitlist].sort((left, right) => {
        const leftPosition = left.position ?? Number.MAX_SAFE_INTEGER
        const rightPosition = right.position ?? Number.MAX_SAFE_INTEGER

        if (leftPosition !== rightPosition) {
          return leftPosition - rightPosition
        }

        const leftCreatedAt = new Date(left.createdAt).getTime()
        const rightCreatedAt = new Date(right.createdAt).getTime()

        if (leftCreatedAt !== rightCreatedAt) {
          return leftCreatedAt - rightCreatedAt
        }

        return left.id.localeCompare(right.id)
      }),
    [waitlist],
  )

  const getAssignableTables = useCallback(
    (reservation: Reservation) =>
      tables.filter(
        (table) =>
          table.capacity >= reservation.partySize &&
          (table.availabilityStatus === 'disponible' || table.id === reservation.tableId),
      ),
    [tables],
  )

  const resetReservationForm = useCallback(() => {
    setEditingReservationId(null)
    setReservationForm(emptyReservationForm())
  }, [])

  const startReservationEdit = useCallback(
    (reservation: Reservation) => {
      if (!canEditReservation(reservation.status)) {
        setReservationState({
          status: 'error',
          message:
            'Solo se pueden editar reservas activas. Elegi una reserva pendiente, confirmada o presentada.',
          data: null,
        })
        return
      }

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

  const handleReservationSend = useCallback(
    async (reservationId: string, status: ReservationStatus, reason?: string) => {
      setReservationState({
        status: 'loading',
        message: 'Enviando reserva...',
        data: null,
      })

      try {
        const updatedReservation =
          status === 'CANCELLED'
            ? await cancelReservation(reservationId, { reason: reason?.trim() })
            : await updateReservationStatus(reservationId, { status })

        setReservationState({
          status: 'success',
          message:
            status === 'CANCELLED'
              ? 'Reserva cancelada y enviada a reportes.'
              : 'Reserva finalizada y enviada a reportes.',
          data: updatedReservation,
        })

        setSelectedFinalStatusByReservationId((current) => {
          const next = { ...current }
          delete next[reservationId]
          return next
        })

        setCancellationReasonByReservationId((current) => {
          const next = { ...current }
          delete next[reservationId]
          return next
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

  const handleTableAvailabilityChange = useCallback(
    async (tableId: string, availabilityStatus: TableAvailabilityStatus) => {
      setTablesState({
        status: 'loading',
        message: 'Actualizando disponibilidad de la mesa...',
        data: [],
      })

      try {
        await updateTableAvailability(tableId, availabilityStatus)
        await Promise.all([refreshTables(), refreshDailyData(viewDate)])
        setTablesState({
          status: 'success',
          message: 'Disponibilidad de la mesa actualizada.',
          data: [],
        })
      } catch (error) {
        setTablesState({ status: 'error', message: getApiErrorMessage(error), data: [] })
      }
    },
    [refreshDailyData, refreshTables, viewDate],
  )

  const handleManualTableAssign = useCallback(
    async (reservation: Reservation) => {
      const tableId = selectedTableForReservationById[reservation.id] ?? reservation.tableId ?? ''

      if (!tableId) {
        setReservationState({
          status: 'error',
          message: 'Selecciona una mesa para asignarla manualmente.',
          data: null,
        })
        return
      }

      setReservationState({
        status: 'loading',
        message: 'Asignando mesa a la reserva...',
        data: null,
      })

      try {
        await assignReservationTable(reservation.id, { tableId })
        setReservationState({
          status: 'success',
          message: 'Mesa asignada correctamente a la reserva.',
          data: null,
        })
        await Promise.all([refreshDailyData(viewDate), refreshTables()])
      } catch (error) {
        setReservationState({ status: 'error', message: getApiErrorMessage(error), data: null })
      }
    },
    [refreshDailyData, refreshTables, selectedTableForReservationById, viewDate],
  )

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

    const selectedTurn = resolveTurnFromTime(reservationForm.time)
    const shiftHint = getShiftHint(shifts, reservationForm.date, selectedTurn)
    const selectedMinutes = toMinutes(reservationForm.time)
    const minMinutes = toMinutes(shiftHint.min)
    const maxMinutes = toMinutes(shiftHint.max)

    if (!Number.isFinite(selectedMinutes) || selectedMinutes < minMinutes || selectedMinutes > maxMinutes) {
      setReservationState({
        status: 'error',
        message: `La hora elegida queda fuera del horario permitido del turno (${shiftHint.window}). Elegi una hora dentro de esa franja.`,
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
        turno: selectedTurn,
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
        message: editingReservationId
          ? 'Reserva actualizada correctamente.'
          : savedReservation.tableId
          ? 'Reserva creada correctamente y mesa asignada automaticamente.'
          : 'Reserva creada correctamente. Queda en lista de espera hasta que se libere una mesa.',
        data: savedReservation,
      })
      resetReservationForm()

      if (viewDate === reservationForm.date) {
        await refreshDailyData(viewDate)
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setReservationState({
          status: 'error',
          message: 'No se pudo completar la reserva por un conflicto de datos o disponibilidad.',
          data: null,
        })
        if (viewDate === reservationForm.date) {
          await refreshDailyData(viewDate)
        }
        return
      }

      const apiMessage = getApiErrorMessage(error)
      setReservationState({
        status: 'error',
        message:
          apiMessage === 'Only active reservations can be updated'
            ? 'Solo se pueden editar reservas activas. Si la reserva ya fue cancelada, marcada como no asistió o finalizada, no se puede guardar.'
            : apiMessage === 'Reservation date must match shift date'
            ? 'La fecha de la reserva no coincide con el turno seleccionado. Elegi la fecha y horario nuevamente e intenta guardar otra vez.'
            : apiMessage === 'La reserva debe caer dentro del horario del turno (06:00-14:00 o 14:00-22:00)' ||
              apiMessage === 'Reservation is outside shift hours'
            ? 'La hora elegida queda fuera del horario permitido del turno (06:00-14:00 o 14:00-22:00). Revisala y probá de nuevo.'
            : apiMessage === 'Reservation start is outside allowed window'
            ? 'La hora elegida ya quedó fuera de la ventana operativa. Elegí una hora actual o futura dentro del turno.'
            : apiMessage,
        data: null,
      })
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
      </div>

      <article className="panel form-panel tables-showcase-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Mesas</p>
            <h3>Maqueta visual del salon</h3>
          </div>
        </div>

        <StatusMessage status={tablesState.status} message={tablesState.message} />

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
            <div className="button-row">
              <button
                type="button"
                className="button button-secondary"
                onClick={() =>
                  void handleTableAvailabilityChange(
                    selectedTable.id,
                    selectedTable.availabilityStatus === 'ocupada' ? 'disponible' : 'ocupada',
                  )
                }
              >
                {selectedTable.availabilityStatus === 'ocupada'
                  ? 'Marcar disponible'
                  : 'Marcar ocupada'}
              </button>
            </div>
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
                  onChange={(event) => {
                    const nextDate = event.target.value
                    const suggested = getSuggestedReservationDateTime()
                    const mustAdjustTime =
                      nextDate === suggested.date && toMinutes(reservationForm.time) < toMinutes(suggested.time)
                    const nextTime = mustAdjustTime ? suggested.time : reservationForm.time

                    setReservationForm({
                      ...reservationForm,
                      date: nextDate,
                      time: nextTime,
                      turn: resolveTurnFromTime(nextTime),
                    })
                  }}
                  required
                />
              </label>
              <label>
                Hora
                <input
                  type="time"
                  value={reservationForm.time}
                  min={turnHint.min}
                  max={turnHint.max}
                  onChange={(event) => {
                    const nextTime = event.target.value
                    const nextTurn = nextTime ? resolveTurnFromTime(nextTime) : reservationForm.turn

                    setReservationForm({
                      ...reservationForm,
                      time: nextTime,
                      turn: nextTurn,
                    })
                  }}
                  required
                />
              </label>
            </div>

            <div className="form-grid">
              <label>
                Turno
                <input
                  type="text"
                  value={turnHint.label}
                  readOnly
                  aria-readonly="true"
                />
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
              <p className="form-hint">Editando reserva #{editingReservationId.slice(0, 8)}.</p>
            ) : null}

            <div className="button-row">
              <button
                type="submit"
                className="button button-primary"
                disabled={reservationState.status === 'loading'}
              >
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

            <div className="history-list receptionist-scroll-list receptionist-waitlist-list receptionist-waitlist-scroll">
              {sortedWaitlist.length ? (
                sortedWaitlist.map((entry) => (
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
              {activeReservations.length ? (
                activeReservations.map((reservation) => {
                  const selectedFinalStatus = selectedFinalStatusByReservationId[reservation.id] ?? ''
                  const cancellationReason = cancellationReasonByReservationId[reservation.id] ?? ''
                  const assignableTables = getAssignableTables(reservation)
                  const selectedAssignableTableId =
                    selectedTableForReservationById[reservation.id] ??
                    reservation.tableId ??
                    assignableTables[0]?.id ??
                    ''

                  return (
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
                          title={
                            canEditReservation(reservation.status)
                              ? 'Editar reserva'
                              : 'Solo se pueden editar reservas activas'
                          }
                        >
                          <img className="button-icon-image" src={editIcon} alt="" aria-hidden="true" />
                        </button>
                        <label className="reservation-status-control">
                          Estado
                          <select
                            value={selectedFinalStatus}
                            onChange={(event) => {
                              const nextStatus = event.target.value as ReservationStatus

                              setSelectedFinalStatusByReservationId((current) => ({
                                ...current,
                                [reservation.id]: nextStatus,
                              }))
                            }}
                          >
                            <option value="" disabled>
                              Seleccionar estado final
                            </option>
                            {FINAL_RESERVATION_STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                            </select>
                          </label>
                          {selectedFinalStatus === 'CANCELLED' ? (
                            <label className="reservation-status-control">
                              Motivo de cancelación
                              <textarea
                                rows={2}
                                minLength={3}
                                maxLength={255}
                                value={cancellationReason}
                                placeholder="Ej: No pudo asistir"
                                onChange={(event) =>
                                  setCancellationReasonByReservationId((current) => ({
                                    ...current,
                                    [reservation.id]: event.target.value,
                                  }))
                                }
                              />
                            </label>
                          ) : null}
                          <label className="reservation-status-control">
                          Mesa
                          <select
                            value={selectedAssignableTableId}
                            onChange={(event) =>
                              setSelectedTableForReservationById((current) => ({
                                ...current,
                                [reservation.id]: event.target.value,
                              }))
                            }
                          >
                            {assignableTables.length ? null : (
                              <option value="" disabled>
                                Sin mesas disponibles
                              </option>
                            )}
                            {assignableTables.map((table) => (
                              <option key={table.id} value={table.id}>
                                {formatTableIdentifier(table.tableNumber)} · {table.capacity} plazas ·{' '}
                                {formatTableAvailabilityStatus(getTableAvailabilityStatus(table))}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => void handleManualTableAssign(reservation)}
                          disabled={!selectedAssignableTableId}
                          title="Asignar mesa manualmente"
                        >
                          Asignar mesa
                        </button>
                        <button
                          type="button"
                          className="button button-ghost button-icon button-icon-send"
                          onClick={() => {
                            if (!selectedFinalStatus) {
                              return
                            }

                            if (selectedFinalStatus === 'CANCELLED' && cancellationReason.trim().length < 3) {
                              setReservationState({
                                status: 'error',
                                message: 'Escribí un motivo de cancelación de al menos 3 caracteres.',
                                data: null,
                              })
                              return
                            }

                            void handleReservationSend(
                              reservation.id,
                              selectedFinalStatus,
                              cancellationReason,
                            )
                          }}
                          disabled={!selectedFinalStatus}
                          aria-label="Enviar reserva"
                          title="Enviar reserva"
                        >
                          <img className="button-icon-image" src={sendIcon} alt="" aria-hidden="true" />
                        </button>
                      </div>
                    </article>
                  )
                })
              ) : (
                <p className="muted">No hay reservas activas para este dia.</p>
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
