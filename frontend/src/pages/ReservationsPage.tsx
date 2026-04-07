import { useState, type FormEvent } from 'react'
import { api, getApiErrorMessage } from '../api/http'
import type {
  AssignTableRequest,
  CreateReservationRequest,
  Reservation,
  UpdateReservationRequest,
} from '../api/types'
import { StatusMessage } from '../components/StatusMessage'
import { formatDateTime, stringifyJson, toIsoFromDatetimeLocal } from '../lib/format'
import { formatReservationStatus } from '../lib/labels'
import { omitEmptyString } from '../lib/forms'

type Status = 'idle' | 'loading' | 'success' | 'error'

interface OperationState<T> {
  status: Status
  message: string
  data: T | null
}

const emptyReservationState = {
  customerId: '',
  shiftId: '',
  partySize: '2',
  startsAt: '',
  endsAt: '',
  tableId: '',
  specialRequests: '',
  notes: '',
}

const emptyPatchState = {
  reservationId: '',
  customerId: '',
  shiftId: '',
  partySize: '',
  startsAt: '',
  endsAt: '',
  tableId: '',
  specialRequests: '',
  notes: '',
}

const buildReservationPreview = (reservation: Reservation) => ({
  id: reservation.id,
  cliente: reservation.customerId,
  mesa: reservation.tableId ?? '—',
  turno: reservation.shiftId,
  fechaReserva: reservation.reservationDate,
  inicio: formatDateTime(reservation.startsAt),
  fin: formatDateTime(reservation.endsAt),
  comensales: reservation.partySize,
  estado: formatReservationStatus(reservation.status),
  solicitudesEspeciales: reservation.specialRequests ?? '—',
  notas: reservation.notes ?? '—',
})

export function ReservationsPage() {
  const [createForm, setCreateForm] = useState(emptyReservationState)
  const [editForm, setEditForm] = useState(emptyPatchState)
  const [assignForm, setAssignForm] = useState({ reservationId: '', tableId: '' })
  const [createState, setCreateState] = useState<OperationState<null>>({
    status: 'idle',
    message: '',
    data: null,
  })
  const [editState, setEditState] = useState<OperationState<null>>({
    status: 'idle',
    message: '',
    data: null,
  })
  const [actionState, setActionState] = useState<OperationState<null>>({
    status: 'idle',
    message: '',
    data: null,
  })
  const [lastReservation, setLastReservation] = useState<Reservation | null>(null)

  const createReservation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreateState({ status: 'loading', message: 'Creando reserva...', data: null })

    try {
      const payload: CreateReservationRequest = omitEmptyString({
        customerId: createForm.customerId.trim(),
        shiftId: createForm.shiftId.trim(),
        partySize: Number(createForm.partySize),
        startsAt: toIsoFromDatetimeLocal(createForm.startsAt),
        endsAt: createForm.endsAt ? toIsoFromDatetimeLocal(createForm.endsAt) : undefined,
        tableId: createForm.tableId.trim() || undefined,
        specialRequests: createForm.specialRequests.trim() || undefined,
        notes: createForm.notes.trim() || undefined,
      })

      const { data } = await api.post<Reservation>('/reservations', payload)
      setLastReservation(data)
      setCreateState({ status: 'success', message: 'Reserva creada.', data: null })
    } catch (error) {
      setCreateState({ status: 'error', message: getApiErrorMessage(error), data: null })
    }
  }

  const updateReservation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setEditState({ status: 'loading', message: 'Actualizando reserva...', data: null })

    try {
      const payload: UpdateReservationRequest = omitEmptyString({
        customerId: editForm.customerId.trim() || undefined,
        shiftId: editForm.shiftId.trim() || undefined,
        partySize: editForm.partySize ? Number(editForm.partySize) : undefined,
        startsAt: editForm.startsAt ? toIsoFromDatetimeLocal(editForm.startsAt) : undefined,
        endsAt: editForm.endsAt ? toIsoFromDatetimeLocal(editForm.endsAt) : undefined,
        tableId: editForm.tableId.trim() ? editForm.tableId.trim() : undefined,
        specialRequests: editForm.specialRequests.trim() || undefined,
        notes: editForm.notes.trim() || undefined,
      })

      const { data } = await api.patch<Reservation>(
        `/reservations/${editForm.reservationId.trim()}`,
        payload,
      )
      setLastReservation(data)
      setEditState({ status: 'success', message: 'Reserva actualizada.', data: null })
    } catch (error) {
      setEditState({ status: 'error', message: getApiErrorMessage(error), data: null })
    }
  }

  const patchReservation = async (
    path: 'cancel' | 'no-show',
    label: string,
  ) => {
    setActionState({ status: 'loading', message: `${label}...`, data: null })

    try {
      const { data } = await api.patch<Reservation>(
        `/reservations/${assignForm.reservationId.trim()}/${path}`,
      )
      setLastReservation(data)
      setActionState({
        status: 'success',
        message: path === 'cancel' ? 'Reserva cancelada.' : 'Ausencia registrada.',
        data: null,
      })
    } catch (error) {
      setActionState({ status: 'error', message: getApiErrorMessage(error), data: null })
    }
  }

  const assignTable = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setActionState({ status: 'loading', message: 'Asignando mesa...', data: null })

    try {
      const payload: AssignTableRequest = omitEmptyString({
        tableId: assignForm.tableId.trim() || undefined,
      })

      const { data } = await api.patch<Reservation>(
        `/reservations/${assignForm.reservationId.trim()}/assign-table`,
        payload,
      )
      setLastReservation(data)
      setActionState({ status: 'success', message: 'Mesa asignada.', data: null })
    } catch (error) {
      setActionState({ status: 'error', message: getApiErrorMessage(error), data: null })
    }
  }

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Creación, edición, cancelación y asignación</p>
          <h2>Reservas</h2>
        </div>
        <p className="muted">
          Alta, edición y cambios de estado desde una misma vista.
        </p>
      </div>

      <div className="two-column-grid">
        <form className="panel form-panel" onSubmit={createReservation}>
          <h3>Registrar reserva</h3>
          <label>
            ID del cliente
            <input
              value={createForm.customerId}
              onChange={(event) =>
                setCreateForm({ ...createForm, customerId: event.target.value })
              }
              required
            />
          </label>
          <label>
            ID del turno
            <input
              value={createForm.shiftId}
              onChange={(event) =>
                setCreateForm({ ...createForm, shiftId: event.target.value })
              }
              required
            />
          </label>
          <div className="form-grid">
            <label>
              Cantidad de comensales
              <input
                type="number"
                min={1}
                value={createForm.partySize}
                onChange={(event) =>
                  setCreateForm({ ...createForm, partySize: event.target.value })
                }
                required
              />
            </label>
            <label>
              Inicio de la reserva
              <input
                type="datetime-local"
                value={createForm.startsAt}
                onChange={(event) =>
                  setCreateForm({ ...createForm, startsAt: event.target.value })
                }
                required
              />
            </label>
          </div>
          <label>
            Fin de la reserva (opcional)
            <input
              type="datetime-local"
              value={createForm.endsAt}
              onChange={(event) =>
                setCreateForm({ ...createForm, endsAt: event.target.value })
              }
            />
          </label>
          <label>
            Mesa sugerida (opcional)
            <input
              value={createForm.tableId}
              onChange={(event) =>
                setCreateForm({ ...createForm, tableId: event.target.value })
              }
            />
          </label>
          <label>
            Solicitudes especiales
            <textarea
              rows={3}
              value={createForm.specialRequests}
              onChange={(event) =>
                setCreateForm({
                  ...createForm,
                  specialRequests: event.target.value,
                })
              }
            />
          </label>
          <label>
            Notas
            <textarea
              rows={3}
              value={createForm.notes}
              onChange={(event) =>
                setCreateForm({ ...createForm, notes: event.target.value })
              }
            />
          </label>

          <button type="submit" className="button button-primary">
            Crear reserva
          </button>
          <StatusMessage status={createState.status} message={createState.message} />
        </form>

        <div className="stacked-panels">
          <form className="panel form-panel" onSubmit={updateReservation}>
            <h3>Modificar reserva</h3>
            <label>
              ID de la reserva
              <input
                value={editForm.reservationId}
                onChange={(event) =>
                  setEditForm({ ...editForm, reservationId: event.target.value })
                }
                required
              />
            </label>
            <div className="form-grid">
              <label>
                ID del cliente
                <input
                  value={editForm.customerId}
                  onChange={(event) =>
                    setEditForm({ ...editForm, customerId: event.target.value })
                  }
                />
              </label>
              <label>
                ID del turno
                <input
                  value={editForm.shiftId}
                  onChange={(event) =>
                    setEditForm({ ...editForm, shiftId: event.target.value })
                  }
                />
              </label>
            </div>
            <div className="form-grid">
              <label>
                Cantidad de comensales
                <input
                  type="number"
                  min={1}
                  value={editForm.partySize}
                  onChange={(event) =>
                    setEditForm({ ...editForm, partySize: event.target.value })
                  }
                />
              </label>
              <label>
                Inicio de la reserva
                <input
                  type="datetime-local"
                  value={editForm.startsAt}
                  onChange={(event) =>
                    setEditForm({ ...editForm, startsAt: event.target.value })
                  }
                />
              </label>
            </div>
            <label>
              Fin de la reserva
              <input
                type="datetime-local"
                value={editForm.endsAt}
                onChange={(event) =>
                  setEditForm({ ...editForm, endsAt: event.target.value })
                }
              />
            </label>
            <label>
              Mesa
              <input
                value={editForm.tableId}
                onChange={(event) =>
                  setEditForm({ ...editForm, tableId: event.target.value })
                }
              />
            </label>
            <label>
              Solicitudes especiales
              <textarea
                rows={2}
                value={editForm.specialRequests}
                onChange={(event) =>
                  setEditForm({
                    ...editForm,
                    specialRequests: event.target.value,
                  })
                }
              />
            </label>
            <label>
              Notas
              <textarea
                rows={2}
                value={editForm.notes}
                onChange={(event) =>
                  setEditForm({ ...editForm, notes: event.target.value })
                }
              />
            </label>

            <button type="submit" className="button button-secondary">
              Guardar cambios
            </button>
            <StatusMessage status={editState.status} message={editState.message} />
          </form>

          <div className="panel form-panel">
            <h3>Cancelar, registrar ausencia y asignar mesa</h3>
            <label>
              ID de la reserva
              <input
                value={assignForm.reservationId}
                onChange={(event) =>
                  setAssignForm({ ...assignForm, reservationId: event.target.value })
                }
                required
              />
            </label>
            <label>
              ID de la mesa
              <input
                value={assignForm.tableId}
                onChange={(event) =>
                  setAssignForm({ ...assignForm, tableId: event.target.value })
                }
              />
            </label>

            <div className="button-row">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => patchReservation('cancel', 'Cancelando reserva')}
              >
                Cancelar reserva
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => patchReservation('no-show', 'Marcando ausencia')}
              >
                Registrar ausencia
              </button>
            </div>

            <form className="inline-form" onSubmit={assignTable}>
              <button type="submit" className="button button-primary">
                Asignar mesa
              </button>
            </form>

            <StatusMessage status={actionState.status} message={actionState.message} />
          </div>
        </div>
      </div>

      <article className="panel result-panel">
        <div className="panel-heading">
          <h3>Última acción</h3>
          <span className="chip">Datos</span>
        </div>
        <pre className="json-block">
          {lastReservation ? stringifyJson(buildReservationPreview(lastReservation)) : 'Sin acciones todavía.'}
        </pre>
        {lastReservation ? (
          <div className="meta-grid">
            <span>ID: {lastReservation.id}</span>
            <span>Estado: {formatReservationStatus(lastReservation.status)}</span>
            <span>Inicio: {formatDateTime(lastReservation.startsAt)}</span>
            <span>Fin: {formatDateTime(lastReservation.endsAt)}</span>
          </div>
        ) : null}
      </article>
    </section>
  )
}
