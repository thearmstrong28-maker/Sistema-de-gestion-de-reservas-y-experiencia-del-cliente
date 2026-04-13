import { type ShiftSlot } from '../../shifts/shift-slot';
export declare class CreateWaitlistEntryDto {
    customerId: string;
    requestedShiftId?: string;
    turno?: ShiftSlot;
    requestedDate: Date;
    partySize: number;
    position?: number;
    notes?: string;
}
