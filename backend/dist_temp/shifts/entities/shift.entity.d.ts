import { ReservationEntity } from '../../reservations/entities/reservation.entity';
import { WaitlistEntryEntity } from '../../waitlist/entities/waitlist-entry.entity';
export declare class ShiftEntity {
    id: string;
    shiftName: string;
    shiftDate: string;
    startsAt: string;
    endsAt: string;
    isActive: boolean;
    reservations?: ReservationEntity[];
    waitlistEntries?: WaitlistEntryEntity[];
    createdAt: Date;
    updatedAt: Date;
}
