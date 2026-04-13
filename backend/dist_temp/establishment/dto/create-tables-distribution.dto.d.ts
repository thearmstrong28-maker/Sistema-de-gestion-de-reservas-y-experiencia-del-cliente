import { TableCategory } from '../../reservations/enums/table-category.enum';
export declare class TableDistributionItemDto {
    tableNumber: number;
    capacity: number;
    posX: number;
    posY: number;
    category?: TableCategory;
    layoutLabel?: string;
}
export declare class CreateTablesDistributionDto {
    tables: TableDistributionItemDto[];
}
