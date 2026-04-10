import { useState, type FormEvent } from 'react'
import { api, getApiErrorMessage } from '../api/http'
import type { Customer, CreateCustomerRequest, Reservation } from '../api/types'
import { StatusMessage } from '../components/StatusMessage'
import { formatDateTime, stringifyJson } from '../lib/format'
import { parseJsonRecord } from '../lib/forms'
import { formatReservationStatus } from '../lib/labels'

type Status = 'idle' | 'loading' | 'success' | 'error'

interface ActionState<T> {
  status: Status
  message: string
  data: T | null
}

const emptyCustomerState = {
  fullName: '',
  email: '',
  phone: '',
  preferences: '',
}

const buildCustomerPreview = (customer: Customer) => ({
  id: customer.id,
  nombreCompleto: customer.fullName,
  correoElectronico: customer.email ?? '—',
  telefono: customer.phone ?? '—',
  preferencias: customer.preferences ?? '—',
  cantidadDeVisitas: customer.visitCount,
  notas: customer.notes ?? '—',
  creadoEl: customer.createdAt,
  actualizadoEl: customer.updatedAt,
})

export function CustomersPage() {
  const [customerForm, setCustomerForm] = useState(emptyCustomerState)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchState, setSearchState] = useState<ActionState<Customer[]>>({
    status: 'idle',
    message: '',
    data: null,
  })
  const [createState, setCreateState] = useState<ActionState<Customer>>({
    status: 'idle',
    message: '',
    data: null,
  })
  const [historyState, setHistoryState] = useState<ActionState<Reservation[]>>({
    status: 'idle',
    message: '',
    data: null,
  })
  const [historyCustomerId, setHistoryCustomerId] = useState('')
  const normalizedSearchTerm = searchTerm.trim().toLowerCase()
  const visibleCustomers =
    searchState.data?.filter((customer) => {
      if (!normalizedSearchTerm) {
        return true
      }

      return [customer.fullName, customer.email, customer.phone, customer.id]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(normalizedSearchTerm))
    }) ?? []

  const createCustomer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreateState({ status: 'loading', message: 'Registrando cliente...', data: null })

    try {
      const payload: CreateCustomerRequest = {
        fullName: customerForm.fullName.trim(),
        email: customerForm.email.trim() || undefined,
        phone: customerForm.phone.trim() || undefined,
        preferences: parseJsonRecord(customerForm.preferences),
      }

      const { data } = await api.post<Customer>('/customers', payload)
      setCreateState({ status: 'success', message: 'Cliente registrado.', data })
      setCustomerForm(emptyCustomerState)
    } catch (error) {
      setCreateState({ status: 'error', message: getApiErrorMessage(error), data: null })
    }
  }

  const searchCustomers = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSearchState({ status: 'loading', message: 'Buscando clientes...', data: null })

    try {
      const { data } = await api.get<Customer[]>('/customers')
      setSearchState({ status: 'success', message: 'Búsqueda lista.', data })
    } catch (error) {
      setSearchState({ status: 'error', message: getApiErrorMessage(error), data: null })
    }
  }

  const loadHistory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setHistoryState({ status: 'loading', message: 'Cargando historial de visitas...', data: null })

    try {
      const { data } = await api.get<Reservation[]>(
        `/customers/${historyCustomerId.trim()}/visit-history`,
      )
      setHistoryState({ status: 'success', message: 'Historial cargado.', data })
    } catch (error) {
      setHistoryState({ status: 'error', message: getApiErrorMessage(error), data: null })
    }
  }

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Registro y seguimiento de clientes</p>
          <h2>Clientes</h2>
        </div>
        <p className="muted">Alta de clientes con preferencias e historial de visitas.</p>
      </div>

      <div className="two-column-grid">
        <form className="panel form-panel" onSubmit={createCustomer}>
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
              Correo electrónico
              <input
                type="email"
                value={customerForm.email}
                onChange={(event) =>
                  setCustomerForm({ ...customerForm, email: event.target.value })
                }
              />
            </label>
            <label>
              Teléfono
              <input
                value={customerForm.phone}
                onChange={(event) =>
                  setCustomerForm({ ...customerForm, phone: event.target.value })
                }
              />
            </label>
          </div>
          <label>
            Preferencias estructuradas
            <textarea
              rows={5}
              placeholder='{"alergias":["frutos secos"],"mesaPreferida":"junto a la ventana"}'
              value={customerForm.preferences}
              onChange={(event) =>
                setCustomerForm({ ...customerForm, preferences: event.target.value })
              }
            />
          </label>
          <button type="submit" className="button button-primary">
            Guardar cliente
          </button>
          <StatusMessage status={createState.status} message={createState.message} />
        </form>

        <div className="stacked-panels">
          <form className="panel form-panel" onSubmit={searchCustomers}>
            <h3>Buscar clientes</h3>
            <label>
              Buscar
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Nombre, correo, teléfono o ID"
              />
            </label>
            <button type="submit" className="button button-secondary">
              Buscar
            </button>
            <StatusMessage status={searchState.status} message={searchState.message} />

            <div className="list-card">
              {visibleCustomers.length ? (
                visibleCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    className="list-row"
                    onClick={() => setHistoryCustomerId(customer.id)}
                  >
                    <strong>{customer.fullName}</strong>
                    <span>{customer.id}</span>
                  </button>
                ))
              ) : searchState.data?.length ? (
                <p className="muted">Sin coincidencias para la búsqueda actual.</p>
              ) : (
                <p className="muted">Sin resultados todavía.</p>
              )}
            </div>
          </form>

          <form className="panel form-panel" onSubmit={loadHistory}>
            <h3>Historial de visitas</h3>
            <label>
              ID del cliente
              <input
                value={historyCustomerId}
                onChange={(event) => setHistoryCustomerId(event.target.value)}
                required
              />
            </label>

            <button type="submit" className="button button-secondary">
              Ver historial
            </button>
            <StatusMessage status={historyState.status} message={historyState.message} />

            <div className="history-list">
              {historyState.data?.length ? (
                historyState.data.map((reservation) => (
                  <article key={reservation.id} className="history-item">
                    <div>
                      <strong>{formatReservationStatus(reservation.status)}</strong>
                      <p>
                        {formatDateTime(reservation.startsAt)} -{' '}
                        {formatDateTime(reservation.endsAt)}
                      </p>
                    </div>
                    <span>{reservation.id}</span>
                  </article>
                ))
              ) : (
                <p className="muted">Todavía no consultaste historial.</p>
              )}
            </div>
          </form>
        </div>
      </div>

      <article className="panel result-panel">
        <div className="panel-heading">
          <h3>Último cliente registrado</h3>
          <span className="chip">Datos</span>
        </div>
        <pre className="json-block">
          {createState.data ? stringifyJson(buildCustomerPreview(createState.data)) : 'Sin registros todavía.'}
        </pre>
      </article>
    </section>
  )
}
