import { type ShiftSlot } from '../../shifts/shift-slot';
export declare class UpdateReservationDto {
    customerId?: string;
    shiftId?: string;
    turno?: ShiftSlot;
    partySize?: number;
    startsAt?: Date;
    endsAt?: Date;
    tableId?: string;
    specialRequests?: string;
    notes?: string;
}
