export type ShiftSlot = 'matutino' | 'vespertino';
export declare const DEFAULT_SHIFT_SLOTS: ShiftSlot[];
export declare const SHIFT_SLOT_WINDOWS: Record<ShiftSlot, {
    startsAt: string;
    endsAt: string;
}>;
export declare const formatLocalDateKey: (value: Date) => string;
export declare const formatLocalTimeKey: (value: Date) => string;
export declare const createLocalDateTime: (date: string, time: string) => Date;
export declare const isShiftSlot: (value: unknown) => value is ShiftSlot;
export declare const buildShiftName: (shiftDate: string, slot: ShiftSlot) => string;
export declare const extractShiftSlot: (shiftName: string | undefined) => ShiftSlot | null;
export declare const getShiftWindow: (shiftName: string | undefined) => {
    startsAt: string;
    endsAt: string;
} | null;
