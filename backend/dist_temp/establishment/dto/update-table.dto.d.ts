import { TableCategory } from '../../reservations/enums/table-category.enum';
import { TableAvailabilityStatus } from '../../reservations/enums/table-availability-status.enum';
export declare class UpdateTableDto {
    capacity?: number;
    availabilityStatus?: TableAvailabilityStatus;
    category?: TableCategory;
}
