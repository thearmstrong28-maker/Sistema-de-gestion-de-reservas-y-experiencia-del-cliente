import { api } from './http'
import type {
  AssignTableRequest,
  AvailabilityResponse,
  CheckAvailabilityRequest,
  CreateCustomerRequest,
  CreateReservationRequest,
  CreateWaitlistEntryRequest,
  Customer,
  CancelReservationRequest,
  ListReservationsQuery,
  ListWaitlistQuery,
  Reservation,
  RestaurantTable,
  Shift,
  TableAvailabilityStatus,
  UpdateReservationRequest,
  UpdateReservationStatusRequest,
  WaitlistEntry,
} from './types'

export const listReservations = async (
  query: ListReservationsQuery,
): Promise<Reservation[]> => {
  const { data } = await api.get<Reservation[]>('/reservations', { params: query })
  return data
}

export const createReservation = async (
  payload: CreateReservationRequest,
): Promise<Reservation> => {
  const { data } = await api.post<Reservation>('/reservations', payload)
  return data
}

export const updateReservation = async (
  id: string,
  payload: UpdateReservationRequest,
): Promise<Reservation> => {
  const { data } = await api.patch<Reservation>(`/reservations/${id}`, payload)
  return data
}

export const updateReservationStatus = async (
  id: string,
  payload: UpdateReservationStatusRequest,
): Promise<Reservation> => {
  const { data } = await api.patch<Reservation>(`/reservations/${id}/status`, payload)
  return data
}

export const assignReservationTable = async (
  id: string,
  payload: AssignTableRequest,
): Promise<Reservation> => {
  const { data } = await api.patch<Reservation>(`/reservations/${id}/assign-table`, payload)
  return data
}

export const cancelReservation = async (
  id: string,
  payload?: CancelReservationRequest,
): Promise<Reservation> => {
  const { data } = await api.patch<Reservation>(`/reservations/${id}/cancel`, payload)
  return data
}

export const markReservationNoShow = async (id: string): Promise<Reservation> => {
  const { data } = await api.patch<Reservation>(`/reservations/${id}/no-show`)
  return data
}

export const checkAvailability = async (
  payload: CheckAvailabilityRequest,
): Promise<AvailabilityResponse> => {
  const { data } = await api.get<AvailabilityResponse>('/reservations/availability', {
    params: payload,
  })
  return data
}

export const listCustomers = async (query = ''): Promise<Customer[]> => {
  const { data } = await api.get<Customer[]>('/customers', {
    params: query.trim() ? { q: query.trim() } : undefined,
  })
  return data
}

export const listShifts = async (): Promise<Shift[]> => {
  const { data } = await api.get<Shift[]>('/shifts')
  return data
}

export const listTablesLayout = async (): Promise<RestaurantTable[]> => {
  const { data } = await api.get<RestaurantTable[]>('/reservations/tables')
  return data
}

export const updateTableAvailability = async (
  id: string,
  availabilityStatus: TableAvailabilityStatus,
): Promise<RestaurantTable> => {
  const { data } = await api.patch<RestaurantTable>(`/establishment/tables/${id}/availability`, {
    availabilityStatus,
  })
  return data
}

export const createCustomer = async (payload: CreateCustomerRequest): Promise<Customer> => {
  const { data } = await api.post<Customer>('/customers', payload)
  return data
}

export const listWaitlist = async (
  query: ListWaitlistQuery,
): Promise<WaitlistEntry[]> => {
  const { data } = await api.get<WaitlistEntry[]>('/waitlist', {
    params: query,
  })
  return data
}

export const createWaitlistEntry = async (
  payload: CreateWaitlistEntryRequest,
): Promise<WaitlistEntry> => {
  const { data } = await api.post<WaitlistEntry>('/waitlist', payload)
  return data
}
