export enum WaitlistStatus {
  Waiting = 'waiting',
  Notified = 'notified',
  Accepted = 'accepted',
  Expired = 'expired',
  Cancelled = 'cancelled',
}

export const ACTIVE_WAITLIST_STATUSES: WaitlistStatus[] = [
  WaitlistStatus.Waiting,
  WaitlistStatus.Notified,
];
