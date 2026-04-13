import { type ShiftSlot } from '../../shifts/shift-slot';
export declare class CheckAvailabilityDto {
    shiftId?: string;
    turno?: ShiftSlot;
    startsAt: Date;
    endsAt?: Date;
    partySize: number;
}
