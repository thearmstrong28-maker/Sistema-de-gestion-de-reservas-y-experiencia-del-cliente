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
        message: path === 'cancel' ? 'Reserva cancelada.' : 'No-show registrado.',
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
          <p className="eyebrow">RF-01 · RF-02 · RF-03 · RF-04</p>
          <h2>Reservas</h2>
        </div>
        <p className="muted">
          Alta, edición y cambios de estado sobre la misma vista.
        </p>
      </div>

      <div className="two-column-grid">
        <form className="panel form-panel" onSubmit={createReservation}>
          <h3>Registrar reserva</h3>
          <label>
            Customer ID
            <input
              value={createForm.customerId}
              onChange={(event) =>
                setCreateForm({ ...createForm, customerId: event.target.value })
              }
              required
            />
          </label>
          <label>
            Shift ID
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
              Comensales
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
              Inicio
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
            Fin (opcional)
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
            Requerimientos especiales
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
              Reserva ID
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
                Customer ID
                <input
                  value={editForm.customerId}
                  onChange={(event) =>
                    setEditForm({ ...editForm, customerId: event.target.value })
                  }
                />
              </label>
              <label>
                Shift ID
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
                Comensales
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
                Inicio
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
              Fin
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
              Requerimientos especiales
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
            <h3>Cancelar, no-show y asignar mesa</h3>
            <label>
              Reserva ID
              <input
                value={assignForm.reservationId}
                onChange={(event) =>
                  setAssignForm({ ...assignForm, reservationId: event.target.value })
                }
                required
              />
            </label>
            <label>
              Mesa ID
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
                Cancelar
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => patchReservation('no-show', 'Marcando no-show')}
              >
                No-show
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
          <h3>Última respuesta</h3>
          <span className="chip">REST</span>
        </div>
        <pre className="json-block">{lastReservation ? stringifyJson(lastReservation) : 'Sin acciones todavía.'}</pre>
        {lastReservation ? (
          <div className="meta-grid">
            <span>ID: {lastReservation.id}</span>
            <span>Estado: {lastReservation.status}</span>
            <span>Inicio: {formatDateTime(lastReservation.startsAt)}</span>
            <span>Fin: {formatDateTime(lastReservation.endsAt)}</span>
          </div>
        ) : null}
      </article>
    </section>
  )
}
