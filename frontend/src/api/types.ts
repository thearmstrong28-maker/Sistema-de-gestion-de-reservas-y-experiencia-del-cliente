export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'SEATED'
  | 'COMPLETED'

export type WaitlistStatus =
  | 'waiting'
  | 'notified'
  | 'accepted'
  | 'expired'
  | 'cancelled'

export type UserRole = 'admin' | 'host' | 'manager' | 'customer'

export type InternalUserRole = 'host' | 'manager'

export interface RestaurantTable {
  id: string
  tableNumber: number
  area: string | null
  capacity: number
  isActive: boolean
}

export interface Shift {
  id: string
  shiftName: string
  shiftDate: string
  startsAt: string
  endsAt: string
  isActive: boolean
}

export interface Customer {
  id: string
  userId: string | null
  fullName: string
  email: string | null
  phone: string | null
  preferences: Record<string, unknown> | null
  visitCount: number
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface Reservation {
  id: string
  customerId: string
  tableId: string | null
  shiftId: string
  reservationDate: string
  startsAt: string
  endsAt: string
  partySize: number
  status: ReservationStatus
  specialRequests: string | null
  notes: string | null
  createdByUserId: string | null
  createdAt: string
  updatedAt: string
  customer?: Customer
  table?: RestaurantTable | null
  shift?: Shift
}

export interface WaitlistEntry {
  id: string
  customerId: string
  requestedShiftId: string | null
  requestedDate: string
  partySize: number
  status: WaitlistStatus
  position: number | null
  notes: string | null
  createdAt: string
  updatedAt: string
  customer?: Customer
  requestedShift?: Shift | null
}

export interface DailyOccupancyRow {
  shiftId: string
  shiftDate: string
  shiftName: string
  totalTables: number
  occupiedTables: number
  reservedGuests: number
  totalCapacity: number
  occupancyPercent: number
}

export interface FrequentCustomerRow {
  customerId: string
  fullName: string
  email: string | null
  phone: string | null
  visitCount: number
  noShowCount: number
  lastVisitAt: string | null
}

export interface AuthProfile {
  userId: string
  email: string
  role: UserRole
  fullName: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
}

export interface RegisterRequest {
  email: string
  phone: string
  restaurantName: string
  password: string
}

export interface RegisterResponse {
  id: string
  email: string
  fullName: string
  restaurantName: string | null
  phone: string | null
  role: UserRole
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateInternalUserRequest {
  email: string
  fullName: string
  password: string
  role: InternalUserRole
}

export interface AdminUser {
  id: string
  email: string
  fullName: string
  role: UserRole
  isActive: boolean
  phone: string | null
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ListUsersQuery {
  role?: Exclude<UserRole, 'admin'>
  isActive?: boolean
}

export type AvailabilityRequest = CheckAvailabilityRequest
export type CreateWaitlistRequest = CreateWaitlistEntryRequest
export type UpdateWaitlistRequest = UpdateWaitlistEntryRequest
export type DailyOccupancyReportRow = DailyOccupancyRow
export type FrequentCustomerReportRow = FrequentCustomerRow
export type VisitHistoryReservation = Reservation

export interface CreateReservationRequest {
  customerId: string
  shiftId: string
  partySize: number
  startsAt: string
  endsAt?: string
  tableId?: string
  specialRequests?: string
  notes?: string
}

export interface UpdateReservationRequest {
  customerId?: string
  shiftId?: string
  partySize?: number
  startsAt?: string
  endsAt?: string
  tableId?: string | null
  specialRequests?: string
  notes?: string
}

export interface AssignTableRequest {
  tableId?: string
}

export interface CheckAvailabilityRequest {
  shiftId: string
  startsAt: string
  endsAt?: string
  partySize: number
}

export interface AvailabilityTable {
  id: string
  tableNumber: number
  capacity: number
  area: string | null
}

export interface AvailabilityResponse {
  shiftId: string
  startsAt: string
  endsAt: string
  partySize: number
  available: boolean
  recommendedTableId: string | null
  availableTables: AvailabilityTable[]
}

export interface CreateCustomerRequest {
  fullName: string
  email?: string
  phone?: string
  preferences?: Record<string, unknown>
  notes?: string
}

export interface UpdateCustomerRequest {
  fullName?: string
  email?: string
  phone?: string
  preferences?: Record<string, unknown>
  notes?: string
}

export interface ListCustomersQuery {
  q?: string
}

export interface CreateWaitlistEntryRequest {
  customerId: string
  requestedShiftId?: string
  requestedDate: string
  partySize: number
  position?: number
  notes?: string
}

export interface UpdateWaitlistEntryRequest {
  status?: WaitlistStatus
  position?: number
  notes?: string
}

export interface ListWaitlistQuery {
  date?: string
  shiftId?: string
}

export interface DailyOccupancyQuery {
  date?: string
  shiftId?: string
}

export interface FrequentCustomersQuery {
  minVisits?: number
  limit?: number
}

export interface ApiErrorResponse {
  message?: string | string[]
  error?: string
  statusCode?: number
}
