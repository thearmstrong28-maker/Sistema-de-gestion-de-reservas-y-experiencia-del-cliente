export enum ReservationStatus {
  Pending = 'PENDING',
  Confirmed = 'CONFIRMED',
  Cancelled = 'CANCELLED',
  NoShow = 'NO_SHOW',
  Seated = 'SEATED',
  Completed = 'COMPLETED',
}

export const ACTIVE_RESERVATION_STATUSES: ReservationStatus[] = [
  ReservationStatus.Pending,
  ReservationStatus.Confirmed,
  ReservationStatus.Seated,
];
