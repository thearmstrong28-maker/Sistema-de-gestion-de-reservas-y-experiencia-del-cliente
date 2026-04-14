export type ShiftSlot = 'matutino' | 'vespertino';

export const DEFAULT_SHIFT_SLOTS: ShiftSlot[] = ['matutino', 'vespertino'];

export const SHIFT_SLOT_WINDOWS: Record<
  ShiftSlot,
  { startsAt: string; endsAt: string }
> = {
  matutino: {
    startsAt: '06:00:00',
    endsAt: '14:00:00',
  },
  vespertino: {
    startsAt: '14:00:00',
    endsAt: '22:00:00',
  },
};

const LEGACY_SHIFT_NAMES: Record<string, ShiftSlot> = {
  breakfast: 'matutino',
  lunch: 'vespertino',
  dinner: 'vespertino',
};

const padTimePart = (value: number): string => String(value).padStart(2, '0');

export const formatLocalDateKey = (value: Date): string =>
  `${value.getUTCFullYear()}-${padTimePart(value.getUTCMonth() + 1)}-${padTimePart(value.getUTCDate())}`;

export const formatLocalTimeKey = (value: Date): string =>
  `${padTimePart(value.getUTCHours())}:${padTimePart(value.getUTCMinutes())}:${padTimePart(value.getUTCSeconds())}`;

export const createLocalDateTime = (date: string, time: string): Date =>
  new Date(`${date}T${time}Z`);

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

  if (shiftName in LEGACY_SHIFT_NAMES) {
    return LEGACY_SHIFT_NAMES[shiftName];
  }

  const candidate = shiftName.split(':').pop();

  return isShiftSlot(candidate) ? candidate : null;
};

export const getShiftWindow = (
  shiftName: string | undefined,
): { startsAt: string; endsAt: string } | null => {
  const slot = extractShiftSlot(shiftName);

  return slot ? SHIFT_SLOT_WINDOWS[slot] : null;
};
