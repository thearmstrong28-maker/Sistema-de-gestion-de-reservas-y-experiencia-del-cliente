import { useState, type FormEvent } from 'react'
import { api, getApiErrorMessage } from '../api/http'
import type { CreateWaitlistEntryRequest, UpdateWaitlistEntryRequest, WaitlistEntry } from '../api/types'
import { StatusMessage } from '../components/StatusMessage'
import { formatDate, stringifyJson } from '../lib/format'

type Status = 'idle' | 'loading' | 'success' | 'error'

interface ActionState<T> {
  status: Status
  message: string
  data: T | null
}

const emptyCreate = {
  customerId: '',
  requestedShiftId: '',
  requestedDate: '',
  partySize: '2',
  position: '',
  notes: '',
}

const emptyUpdate = {
  entryId: '',
  status: '',
  position: '',
  notes: '',
}

export function WaitlistPage() {
  const [createForm, setCreateForm] = useState(emptyCreate)
  const [listForm, setListForm] = useState({
    date: new Date().toLocaleDateString('en-CA'),
    shiftId: '',
  })
  const [updateForm, setUpdateForm] = useState(emptyUpdate)
  const [lastResponse, setLastResponse] = useState<WaitlistEntry | WaitlistEntry[] | null>(null)
  const [createState, setCreateState] = useState<ActionState<WaitlistEntry>>({
    status: 'idle',
    message: '',
    data: null,
  })
  const [listState, setListState] = useState<ActionState<WaitlistEntry[]>>({
    status: 'idle',
    message: '',
    data: null,
  })
  const [updateState, setUpdateState] = useState<ActionState<WaitlistEntry>>({
    status: 'idle',
    message: '',
    data: null,
  })

  const createEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreateState({ status: 'loading', message: 'Creando entrada...', data: null })

    try {
      const payload: CreateWaitlistEntryRequest = {
        customerId: createForm.customerId.trim(),
        requestedShiftId: createForm.requestedShiftId.trim() || undefined,
        requestedDate: createForm.requestedDate,
        partySize: Number(createForm.partySize),
        position: createForm.position ? Number(createForm.position) : undefined,
        notes: createForm.notes.trim() || undefined,
      }

      const { data } = await api.post<WaitlistEntry>('/waitlist', payload)
      setLastResponse(data)
      setCreateState({ status: 'success', message: 'Entrada creada.', data })
    } catch (error) {
      setCreateState({ status: 'error', message: getApiErrorMessage(error), data: null })
    }
  }

  const listEntries = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setListState({ status: 'loading', message: 'Cargando waitlist...', data: null })

    try {
      const { data } = await api.get<WaitlistEntry[]>('/waitlist', {
        params: {
          ...(listForm.date ? { date: listForm.date } : {}),
          ...(listForm.shiftId.trim() ? { shiftId: listForm.shiftId.trim() } : {}),
        },
      })
      setLastResponse(data)
      setListState({ status: 'success', message: 'Waitlist actualizada.', data })
    } catch (error) {
      setListState({ status: 'error', message: getApiErrorMessage(error), data: null })
    }
  }

  const updateEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setUpdateState({ status: 'loading', message: 'Actualizando entrada...', data: null })

    try {
      const payload: UpdateWaitlistEntryRequest = {
        status: updateForm.status ? (updateForm.status as UpdateWaitlistEntryRequest['status']) : undefined,
        position: updateForm.position ? Number(updateForm.position) : undefined,
        notes: updateForm.notes.trim() || undefined,
      }

      const { data } = await api.patch<WaitlistEntry>(
        `/waitlist/${updateForm.entryId.trim()}`,
        payload,
      )
      setLastResponse(data)
      setUpdateState({ status: 'success', message: 'Entrada actualizada.', data })
    } catch (error) {
      setUpdateState({ status: 'error', message: getApiErrorMessage(error), data: null })
    }
  }

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">RF-10</p>
          <h2>Lista de espera</h2>
        </div>
        <p className="muted">Alta, listado y edición simple de entradas de espera.</p>
      </div>

      <div className="two-column-grid">
        <form className="panel form-panel" onSubmit={createEntry}>
          <h3>Nueva entrada</h3>
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
            Shift ID (opcional)
            <input
              value={createForm.requestedShiftId}
              onChange={(event) =>
                setCreateForm({ ...createForm, requestedShiftId: event.target.value })
              }
            />
          </label>
          <div className="form-grid">
            <label>
              Fecha solicitada
              <input
                type="date"
                value={createForm.requestedDate}
                onChange={(event) =>
                  setCreateForm({ ...createForm, requestedDate: event.target.value })
                }
                required
              />
            </label>
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
          </div>
          <label>
            Posición (opcional)
            <input
              type="number"
              min={1}
              value={createForm.position}
              onChange={(event) =>
                setCreateForm({ ...createForm, position: event.target.value })
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
            Crear entrada
          </button>
          <StatusMessage status={createState.status} message={createState.message} />
        </form>

        <div className="stacked-panels">
          <form className="panel form-panel" onSubmit={listEntries}>
            <h3>Listar waitlist</h3>
            <div className="form-grid">
              <label>
                Fecha
                <input
                  type="date"
                  value={listForm.date}
                  onChange={(event) =>
                    setListForm({ ...listForm, date: event.target.value })
                  }
                />
              </label>
              <label>
                Shift ID
                <input
                  value={listForm.shiftId}
                  onChange={(event) =>
                    setListForm({ ...listForm, shiftId: event.target.value })
                  }
                />
              </label>
            </div>
            <button type="submit" className="button button-secondary">
              Listar
            </button>
            <StatusMessage status={listState.status} message={listState.message} />

            <div className="history-list">
              {listState.data?.length ? (
                listState.data.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="list-row"
                    onClick={() => setUpdateForm({ ...updateForm, entryId: entry.id })}
                  >
                    <strong>{entry.status}</strong>
                    <span>
                      Posición {entry.position ?? '—'} · {formatDate(entry.requestedDate)}
                    </span>
                  </button>
                ))
              ) : (
                <p className="muted">Sin registros cargados.</p>
              )}
            </div>
          </form>

          <form className="panel form-panel" onSubmit={updateEntry}>
            <h3>Actualizar entrada</h3>
            <label>
              Entry ID
              <input
                value={updateForm.entryId}
                onChange={(event) =>
                  setUpdateForm({ ...updateForm, entryId: event.target.value })
                }
                required
              />
            </label>
            <label>
              Estado
              <select
                value={updateForm.status}
                onChange={(event) =>
                  setUpdateForm({ ...updateForm, status: event.target.value })
                }
              >
                <option value="">Sin cambio</option>
                <option value="waiting">waiting</option>
                <option value="notified">notified</option>
                <option value="accepted">accepted</option>
                <option value="expired">expired</option>
                <option value="cancelled">cancelled</option>
              </select>
            </label>
            <label>
              Posición
              <input
                type="number"
                min={1}
                value={updateForm.position}
                onChange={(event) =>
                  setUpdateForm({ ...updateForm, position: event.target.value })
                }
              />
            </label>
            <label>
              Notas
              <textarea
                rows={3}
                value={updateForm.notes}
                onChange={(event) =>
                  setUpdateForm({ ...updateForm, notes: event.target.value })
                }
              />
            </label>

            <button type="submit" className="button button-secondary">
              Guardar
            </button>
            <StatusMessage status={updateState.status} message={updateState.message} />
          </form>
        </div>
      </div>

      <article className="panel result-panel">
        <div className="panel-heading">
          <h3>Última respuesta</h3>
          <span className="chip">REST</span>
        </div>
        <pre className="json-block">
          {lastResponse
            ? stringifyJson(
                Array.isArray(lastResponse)
                  ? { total: lastResponse.length, items: lastResponse }
                  : lastResponse,
              )
            : 'Sin datos todavía.'}
        </pre>
      </article>
    </section>
  )
}
