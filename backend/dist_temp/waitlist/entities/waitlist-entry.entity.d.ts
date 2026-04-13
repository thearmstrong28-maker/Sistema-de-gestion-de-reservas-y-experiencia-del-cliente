import { CustomerEntity } from '../../customers/entities/customer.entity';
import { ShiftEntity } from '../../shifts/entities/shift.entity';
import { WaitlistStatus } from '../enums/waitlist-status.enum';
export declare class WaitlistEntryEntity {
    id: string;
    customerId: string;
    customer?: CustomerEntity;
    requestedShiftId?: string | null;
    requestedShift?: ShiftEntity | null;
    requestedDate: string;
    partySize: number;
    status: WaitlistStatus;
    position?: number | null;
    notes?: string | null;
    createdAt: Date;
    updatedAt: Date;
}
