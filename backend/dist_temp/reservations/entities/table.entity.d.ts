import { ReservationEntity } from './reservation.entity';
import { TableCategory } from '../enums/table-category.enum';
import { TableAvailabilityStatus } from '../enums/table-availability-status.enum';
export declare class RestaurantTableEntity {
    id: string;
    tableNumber: number;
    area?: string | null;
    capacity: number;
    category: TableCategory;
    availabilityStatus: TableAvailabilityStatus;
    posX?: number | null;
    posY?: number | null;
    layoutLabel?: string | null;
    isActive: boolean;
    reservations?: ReservationEntity[];
    createdAt: Date;
    updatedAt: Date;
}
export { RestaurantTableEntity as TableEntity };
