import { DataSource, Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ReservationEntity } from '../reservations/entities/reservation.entity';
import { RestaurantTableEntity } from '../reservations/entities/table.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { CreateTablesBulkDto } from './dto/create-tables-bulk.dto';
import { CreateTablesDistributionDto } from './dto/create-tables-distribution.dto';
import { UpdateTableAvailabilityDto } from './dto/update-table-availability.dto';
import { UpdateTableDto } from './dto/update-table.dto';
export interface EstablishmentSummary {
    restaurantName: string;
    usersCount: number;
    activeUsersCount: number;
    customerUsersCount: number;
    internalUsersCount: number;
    tablesCount: number;
    activeTablesCount: number;
    reservationsCount: number;
}
export declare class EstablishmentService {
    private readonly userRepository;
    private readonly tableRepository;
    private readonly reservationRepository;
    private readonly dataSource;
    constructor(userRepository: Repository<UserEntity>, tableRepository: Repository<RestaurantTableEntity>, reservationRepository: Repository<ReservationEntity>, dataSource: DataSource);
    getSummary(admin: AuthenticatedUser): Promise<EstablishmentSummary>;
    listTables(): Promise<RestaurantTableEntity[]>;
    updateTableAvailability(id: string, payload: UpdateTableAvailabilityDto): Promise<RestaurantTableEntity>;
    updateTable(id: string, payload: UpdateTableDto): Promise<RestaurantTableEntity>;
    deleteTable(id: string): Promise<RestaurantTableEntity>;
    createTablesBulk(payload: CreateTablesBulkDto): Promise<RestaurantTableEntity[]>;
    createTablesDistribution(payload: CreateTablesDistributionDto): Promise<RestaurantTableEntity[]>;
    private resolveRestaurantName;
    private validateDistribution;
    private promoteWaitlistEntryIfEligible;
    private resolveCurrentSlot;
}
