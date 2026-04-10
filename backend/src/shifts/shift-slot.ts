export type ShiftSlot = 'matutino' | 'vespertino';

export const DEFAULT_SHIFT_SLOTS: ShiftSlot[] = ['matutino', 'vespertino'];

export const SHIFT_SLOT_WINDOWS: Record<
  ShiftSlot,
  { startsAt: string; endsAt: string }
> = {
  matutino: {
    startsAt: '08:00:00',
    endsAt: '15:00:00',
  },
  vespertino: {
    startsAt: '15:00:00',
    endsAt: '23:00:00',
  },
};

export const isShiftSlot = (value: unknown): value is ShiftSlot =>
  value === 'matutino' || value === 'vespertino';

export const buildShiftName = (shiftDate: string, slot: ShiftSlot): string =>
  `${shiftDate}:${slot}`;

export const extractShiftSlot = (
  shiftName: string | undefined,
): ShiftSlot | null => {
  if (!shiftName) {
    return null;
  }

  const candidate = shiftName.split(':').pop();

  return isShiftSlot(candidate) ? candidate : null;
};
