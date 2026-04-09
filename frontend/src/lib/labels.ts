import type { ReservationStatus, UserRole, WaitlistStatus } from '../api/types'

export const formatReservationStatus = (status: ReservationStatus): string => {
  switch (status) {
    case 'PENDING':
      return 'Pendiente'
    case 'CONFIRMED':
      return 'Confirmada'
    case 'CANCELLED':
      return 'Cancelada'
    case 'NO_SHOW':
      return 'Sin asistencia'
    case 'SEATED':
      return 'En mesa'
    case 'COMPLETED':
      return 'Finalizada'
  }
}

export const formatWaitlistStatus = (status: WaitlistStatus): string => {
  switch (status) {
    case 'waiting':
      return 'En espera'
    case 'notified':
      return 'Notificada'
    case 'accepted':
      return 'Aceptada'
    case 'expired':
      return 'Vencida'
    case 'cancelled':
      return 'Cancelada'
  }
}

export const formatUserRole = (role: UserRole): string => {
  switch (role) {
    case 'admin':
      return 'Administrador'
    case 'host':
      return 'Recepcionista'
    case 'manager':
      return 'Gerente'
    case 'customer':
      return 'Cliente'
  }
}
