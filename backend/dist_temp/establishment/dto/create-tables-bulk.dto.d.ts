import { TableCategory } from '../../reservations/enums/table-category.enum';
export declare class CreateTablesBulkDto {
    quantity: number;
    capacity?: number;
    category?: TableCategory;
}
