import { UserEntity } from '../../auth/entities/user.entity';
import { CustomerEntity } from '../../customers/entities/customer.entity';
import { RestaurantTableEntity } from './table.entity';
import { ShiftEntity } from '../../shifts/entities/shift.entity';
import { ReservationStatus } from '../enums/reservation-status.enum';
export declare class ReservationEntity {
    id: string;
    customerId: string;
    customer?: CustomerEntity;
    tableId?: string | null;
    table?: RestaurantTableEntity | null;
    shiftId: string;
    shift?: ShiftEntity;
    reservationDate: string;
    startsAt: Date;
    endsAt: Date;
    partySize: number;
    status: ReservationStatus;
    specialRequests?: string | null;
    cancellationReason?: string | null;
    notes?: string | null;
    createdByUserId?: string | null;
    createdByUser?: UserEntity | null;
    createdAt: Date;
    updatedAt: Date;
}
