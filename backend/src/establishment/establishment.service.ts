import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Role } from '../auth/enums/role.enum';
import { ReservationEntity } from '../reservations/entities/reservation.entity';
import { RestaurantTableEntity } from '../reservations/entities/table.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { CreateTablesBulkDto } from './dto/create-tables-bulk.dto';
import {
  CreateTablesDistributionDto,
  TableDistributionItemDto,
} from './dto/create-tables-distribution.dto';

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

@Injectable()
export class EstablishmentService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RestaurantTableEntity)
    private readonly tableRepository: Repository<RestaurantTableEntity>,
    @InjectRepository(ReservationEntity)
    private readonly reservationRepository: Repository<ReservationEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async getSummary(admin: AuthenticatedUser): Promise<EstablishmentSummary> {
    const restaurantName = this.resolveRestaurantName(admin);
    const scopedRoles = [Role.Customer, Role.Host, Role.Manager];

    const [
      usersCount,
      activeUsersCount,
      customerUsersCount,
      internalUsersCount,
      tablesCount,
      activeTablesCount,
      reservationsCount,
    ] = await Promise.all([
      this.userRepository.count({
        where: { restaurantName, role: In(scopedRoles) },
      }),
      this.userRepository.count({
        where: { restaurantName, isActive: true, role: In(scopedRoles) },
      }),
      this.userRepository.count({
        where: { restaurantName, role: Role.Customer },
      }),
      this.userRepository.count({
        where: { restaurantName, role: In([Role.Host, Role.Manager]) },
      }),
      this.tableRepository.count(),
      this.tableRepository.count({ where: { isActive: true } }),
      this.reservationRepository.count(),
    ]);

    return {
      restaurantName,
      usersCount,
      activeUsersCount,
      customerUsersCount,
      internalUsersCount,
      tablesCount,
      activeTablesCount,
      reservationsCount,
    };
  }

  async listTables(): Promise<RestaurantTableEntity[]> {
    return this.tableRepository.find({
      order: { posY: 'ASC', posX: 'ASC', tableNumber: 'ASC' },
    });
  }

  async createTablesBulk(
    payload: CreateTablesBulkDto,
  ): Promise<RestaurantTableEntity[]> {
    if (payload.quantity < 1) {
      throw new BadRequestException('La cantidad debe ser al menos 1');
    }

    const capacity = payload.capacity ?? 2;

    return this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock($1)', [914_202_601]);

      const maxTableRows = (await manager.query(
        'SELECT COALESCE(MAX(table_number), 0) AS "maxTableNumber" FROM restaurant_tables',
      )) as unknown as Array<{ maxTableNumber: number | string }>;
      const startNumber = Number(maxTableRows[0]?.maxTableNumber ?? 0) + 1;

      const tables = Array.from({ length: payload.quantity }, (_, index) =>
        manager.create(RestaurantTableEntity, {
          tableNumber: startNumber + index,
          capacity,
          posX: (index % 6) * 120,
          posY: Math.floor(index / 6) * 120,
          layoutLabel: 'Principal',
          isActive: true,
        }),
      );

      return manager.getRepository(RestaurantTableEntity).save(tables);
    });
  }

  async createTablesDistribution(
    payload: CreateTablesDistributionDto,
  ): Promise<RestaurantTableEntity[]> {
    if (!payload.tables.length) {
      throw new BadRequestException(
        'Debés incluir al menos una mesa en la distribución',
      );
    }

    this.validateDistribution(payload.tables);

    await this.dataSource.transaction(async (manager) => {
      for (const table of payload.tables) {
        await manager.query(
          `
            INSERT INTO restaurant_tables (table_number, capacity, pos_x, pos_y, layout_label, is_active)
            VALUES ($1, $2, $3, $4, $5, true)
            ON CONFLICT (table_number)
            DO UPDATE SET
              capacity = EXCLUDED.capacity,
              pos_x = EXCLUDED.pos_x,
              pos_y = EXCLUDED.pos_y,
              layout_label = EXCLUDED.layout_label,
              is_active = true,
              updated_at = NOW()
          `,
          [
            table.tableNumber,
            table.capacity,
            table.posX,
            table.posY,
            table.layoutLabel?.trim() || null,
          ],
        );
      }
    });

    return this.listTables();
  }

  private resolveRestaurantName(admin: AuthenticatedUser): string {
    // MVP mono-restaurante: el scope se toma del admin autenticado.
    return admin.restaurantName?.trim() || 'Restaurante principal';
  }

  private validateDistribution(tables: TableDistributionItemDto[]): void {
    const tableNumbers = new Set<number>();
    const coordinates = new Set<string>();

    for (const table of tables) {
      if (tableNumbers.has(table.tableNumber)) {
        throw new BadRequestException(
          `La mesa ${table.tableNumber} está repetida en la distribución`,
        );
      }

      tableNumbers.add(table.tableNumber);

      const coordinateKey = `${table.posX}:${table.posY}`;
      if (coordinates.has(coordinateKey)) {
        throw new BadRequestException(
          `Hay dos mesas con la misma posición (${table.posX}, ${table.posY})`,
        );
      }

      coordinates.add(coordinateKey);
    }
  }
}
