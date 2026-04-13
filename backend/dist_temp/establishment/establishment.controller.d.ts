import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateTablesBulkDto } from './dto/create-tables-bulk.dto';
import { CreateTablesDistributionDto } from './dto/create-tables-distribution.dto';
import { UpdateTableAvailabilityDto } from './dto/update-table-availability.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { EstablishmentService } from './establishment.service';
export declare class EstablishmentController {
    private readonly establishmentService;
    constructor(establishmentService: EstablishmentService);
    getSummary(request: Request & {
        user: AuthenticatedUser;
    }): Promise<import("./establishment.service").EstablishmentSummary>;
    listTables(): Promise<import("../reservations/entities/table.entity").RestaurantTableEntity[]>;
    createTablesBulk(payload: CreateTablesBulkDto): Promise<import("../reservations/entities/table.entity").RestaurantTableEntity[]>;
    createTablesDistribution(payload: CreateTablesDistributionDto): Promise<import("../reservations/entities/table.entity").RestaurantTableEntity[]>;
    updateTableAvailability(id: string, payload: UpdateTableAvailabilityDto): Promise<import("../reservations/entities/table.entity").RestaurantTableEntity>;
    updateTable(id: string, payload: UpdateTableDto): Promise<import("../reservations/entities/table.entity").RestaurantTableEntity>;
    removeTable(id: string): Promise<import("../reservations/entities/table.entity").RestaurantTableEntity>;
}
