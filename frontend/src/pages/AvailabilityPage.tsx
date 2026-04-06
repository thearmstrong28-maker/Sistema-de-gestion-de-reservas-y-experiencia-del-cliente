import { useState, type FormEvent } from 'react'
import { api, getApiErrorMessage } from '../api/http'
import type {
  AvailabilityResponse,
  CheckAvailabilityRequest,
  Reservation,
} from '../api/types'
import { StatusMessage } from '../components/StatusMessage'
import { formatDateTime, stringifyJson, toIsoFromDatetimeLocal } from '../lib/format'

type Status = 'idle' | 'loading' | 'success' | 'error'

interface ActionState<T> {
  status: Status
  message: string
  data: T | null
}

const emptyForm = {
  shiftId: '',
  startsAt: '',
  endsAt: '',
  partySize: '2',
}

export function AvailabilityPage() {
  const [availabilityForm, setAvailabilityForm] = useState(emptyForm)
  const [reservationId, setReservationId] = useState('')
  const [tableId, setTableId] = useState('')
  const [availabilityState, setAvailabilityState] = useState<
    ActionState<AvailabilityResponse>
  >({ status: 'idle', message: '', data: null })
  const [assignState, setAssignState] = useState<ActionState<Reservation>>({
    status: 'idle',
    message: '',
    data: null,
  })

  const checkAvailability = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAvailabilityState({
      status: 'loading',
      message: 'Consultando disponibilidad...',
      data: null,
    })

    try {
      const payload: CheckAvailabilityRequest = {
        shiftId: availabilityForm.shiftId.trim(),
        startsAt: toIsoFromDatetimeLocal(availabilityForm.startsAt),
        endsAt: availabilityForm.endsAt ? toIsoFromDatetimeLocal(availabilityForm.endsAt) : undefined,
        partySize: Number(availabilityForm.partySize),
      }

      const { data } = await api.get<AvailabilityResponse>('/reservations/availability', {
        params: payload,
      })
      setAvailabilityState({ status: 'success', message: 'Disponibilidad lista.', data })
    } catch (error) {
      setAvailabilityState({ status: 'error', message: getApiErrorMessage(error), data: null })
    }
  }

  const assignTable = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAssignState({ status: 'loading', message: 'Asignando mesa...', data: null })

    try {
      const { data } = await api.patch<Reservation>(
        `/reservations/${reservationId.trim()}/assign-table`,
        tableId.trim() ? { tableId: tableId.trim() } : {},
      )
      setAssignState({ status: 'success', message: 'Mesa asignada.', data })
    } catch (error) {
      setAssignState({ status: 'error', message: getApiErrorMessage(error), data: null })
    }
  }

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">RF-07</p>
          <h2>Mesas / Disponibilidad</h2>
        </div>
        <p className="muted">Consulta de disponibilidad y asignación de mesa sobre reserva.</p>
      </div>

      <div className="two-column-grid">
        <form className="panel form-panel" onSubmit={checkAvailability}>
          <h3>Consultar disponibilidad</h3>
          <label>
            Shift ID
            <input
              value={availabilityForm.shiftId}
              onChange={(event) =>
                setAvailabilityForm({ ...availabilityForm, shiftId: event.target.value })
              }
              required
            />
          </label>
          <div className="form-grid">
            <label>
              Inicio
              <input
                type="datetime-local"
                value={availabilityForm.startsAt}
                onChange={(event) =>
                  setAvailabilityForm({ ...availabilityForm, startsAt: event.target.value })
                }
                required
              />
            </label>
            <label>
              Fin
              <input
                type="datetime-local"
                value={availabilityForm.endsAt}
                onChange={(event) =>
                  setAvailabilityForm({ ...availabilityForm, endsAt: event.target.value })
                }
              />
            </label>
          </div>
          <label>
            Comensales
            <input
              type="number"
              min={1}
              value={availabilityForm.partySize}
              onChange={(event) =>
                setAvailabilityForm({ ...availabilityForm, partySize: event.target.value })
              }
              required
            />
          </label>

          <button type="submit" className="button button-primary">
            Verificar
          </button>
          <StatusMessage
            status={availabilityState.status}
            message={availabilityState.message}
          />
        </form>

        <div className="stacked-panels">
          <form className="panel form-panel" onSubmit={assignTable}>
            <h3>Asignar mesa</h3>
            <label>
              Reserva ID
              <input
                value={reservationId}
                onChange={(event) => setReservationId(event.target.value)}
                required
              />
            </label>
            <label>
              Mesa ID (opcional)
              <input value={tableId} onChange={(event) => setTableId(event.target.value)} />
            </label>

            <button type="submit" className="button button-secondary">
              Asignar
            </button>
            <StatusMessage status={assignState.status} message={assignState.message} />
          </form>

          <article className="panel result-panel">
            <div className="panel-heading">
              <h3>Resultado</h3>
              <span className="chip">
                {availabilityState.data
                  ? availabilityState.data.available
                    ? 'Disponible'
                    : 'No disponible'
                  : 'Sin datos'}
              </span>
            </div>

            <pre className="json-block">
              {availabilityState.data
                ? stringifyJson(availabilityState.data)
                : 'Esperando consulta.'}
            </pre>

            {availabilityState.data ? (
              <div className="table-list">
                {availabilityState.data.availableTables.map((table) => (
                  <article key={table.id} className="table-pill">
                    <strong>Mesa {table.tableNumber}</strong>
                    <span>Capacidad {table.capacity}</span>
                    <span>{table.area ?? 'Sin área'}</span>
                  </article>
                ))}
                <div className="meta-grid">
                  <span>Inicio: {formatDateTime(availabilityState.data.startsAt)}</span>
                  <span>Fin: {formatDateTime(availabilityState.data.endsAt)}</span>
                  <span>Recomendada: {availabilityState.data.recommendedTableId ?? '—'}</span>
                </div>
              </div>
            ) : null}
          </article>
        </div>
      </div>

      <article className="panel result-panel">
        <div className="panel-heading">
          <h3>Última mesa asignada</h3>
          <span className="chip">REST</span>
        </div>
        <pre className="json-block">
          {assignState.data ? stringifyJson(assignState.data) : 'Sin acciones todavía.'}
        </pre>
      </article>
    </section>
  )
}
