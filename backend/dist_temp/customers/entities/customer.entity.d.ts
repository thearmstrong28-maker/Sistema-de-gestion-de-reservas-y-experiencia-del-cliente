import { UserEntity } from '../../auth/entities/user.entity';
import { ReservationEntity } from '../../reservations/entities/reservation.entity';
import { WaitlistEntryEntity } from '../../waitlist/entities/waitlist-entry.entity';
export declare class CustomerEntity {
    id: string;
    userId?: string | null;
    user?: UserEntity | null;
    fullName: string;
    email?: string | null;
    phone?: string | null;
    preferences: Record<string, unknown>;
    visitCount: number;
    notes?: string | null;
    reservations?: ReservationEntity[];
    waitlistEntries?: WaitlistEntryEntity[];
    createdAt: Date;
    updatedAt: Date;
}
