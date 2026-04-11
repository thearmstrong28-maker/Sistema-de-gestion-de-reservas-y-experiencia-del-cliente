import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Role } from '../auth/enums/role.enum';
import { ReservationEntity } from '../reservations/entities/reservation.entity';
import { RestaurantTableEntity } from '../reservations/entities/table.entity';
import { TableCategory } from '../reservations/enums/table-category.enum';
import { TableAvailabilityStatus } from '../reservations/enums/table-availability-status.enum';
import {
  ACTIVE_RESERVATION_STATUSES,
  ReservationStatus,
} from '../reservations/enums/reservation-status.enum';
import {
  buildShiftName,
  type ShiftSlot,
  SHIFT_SLOT_WINDOWS,
} from '../shifts/shift-slot';
import { ShiftEntity } from '../shifts/entities/shift.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { WaitlistEntryEntity } from '../waitlist/entities/waitlist-entry.entity';
import { ACTIVE_WAITLIST_STATUSES } from '../waitlist/enums/waitlist-status.enum';
import { CreateTablesBulkDto } from './dto/create-tables-bulk.dto';
import {
  CreateTablesDistributionDto,
  TableDistributionItemDto,
} from './dto/create-tables-distribution.dto';
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
      where: { isActive: true },
      order: { posY: 'ASC', posX: 'ASC', tableNumber: 'ASC' },
    });
  }

  async updateTableAvailability(
    id: string,
    payload: UpdateTableAvailabilityDto,
  ): Promise<RestaurantTableEntity> {
    return this.dataSource.transaction(async (manager) => {
      const tableRepository = manager.getRepository(RestaurantTableEntity);
      const table = await tableRepository
        .createQueryBuilder('table')
        .setLock('pessimistic_write')
        .where('table.id = :id', { id })
        .andWhere('table.isActive = true')
        .getOne();

      if (!table) {
        throw new NotFoundException('La mesa no existe');
      }

      table.availabilityStatus = payload.availabilityStatus;

      if (payload.availabilityStatus === TableAvailabilityStatus.Disponible) {
        const promoted = await this.promoteWaitlistEntryIfEligible(
          manager,
          table,
        );
        if (promoted) {
          table.availabilityStatus = TableAvailabilityStatus.Ocupada;
        }
      }

      return tableRepository.save(table);
    });
  }

  async updateTable(
    id: string,
    payload: UpdateTableDto,
  ): Promise<RestaurantTableEntity> {
    if (
      payload.capacity === undefined &&
      payload.availabilityStatus === undefined &&
      payload.category === undefined
    ) {
      throw new BadRequestException(
        'Debés enviar al menos un dato para actualizar la mesa',
      );
    }

    const table = await this.tableRepository.findOne({
      where: { id, isActive: true },
    });

    if (!table) {
      throw new NotFoundException('La mesa no existe');
    }

    if (payload.capacity !== undefined) {
      if (payload.capacity < 1) {
        throw new BadRequestException('La capacidad debe ser al menos 1');
      }

      table.capacity = payload.capacity;
    }

    if (payload.availabilityStatus !== undefined) {
      table.availabilityStatus = payload.availabilityStatus;
    }

    if (payload.category !== undefined) {
      table.category = payload.category;
    }

    return this.tableRepository.save(table);
  }

  async deleteTable(id: string): Promise<RestaurantTableEntity> {
    const table = await this.tableRepository.findOne({
      where: { id, isActive: true },
    });

    if (!table) {
      throw new NotFoundException('La mesa no existe');
    }

    table.isActive = false;
    table.availabilityStatus = TableAvailabilityStatus.Disponible;
    return this.tableRepository.save(table);
  }

  async createTablesBulk(
    payload: CreateTablesBulkDto,
  ): Promise<RestaurantTableEntity[]> {
    if (payload.quantity < 1) {
      throw new BadRequestException('La cantidad debe ser al menos 1');
    }

    const capacity = payload.capacity ?? 2;
    const category = payload.category ?? TableCategory.Normal;

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
          category,
          availabilityStatus: TableAvailabilityStatus.Disponible,
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
            INSERT INTO restaurant_tables (table_number, capacity, pos_x, pos_y, layout_label, category, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, true)
            ON CONFLICT (table_number)
            DO UPDATE SET
              capacity = EXCLUDED.capacity,
              pos_x = EXCLUDED.pos_x,
              pos_y = EXCLUDED.pos_y,
              category = EXCLUDED.category,
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
            table.category ?? TableCategory.Normal,
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

  private async promoteWaitlistEntryIfEligible(
    manager: EntityManager,
    table: RestaurantTableEntity,
  ): Promise<boolean> {
    const now = new Date();
    const currentSlot = this.resolveCurrentSlot(now);

    if (!currentSlot) {
      return false;
    }

    const reservationDate = now.toISOString().slice(0, 10);
    const shiftName = buildShiftName(reservationDate, currentSlot);
    const shiftRepository = manager.getRepository(ShiftEntity);
    const shift = await shiftRepository.findOne({
      where: { shiftName, isActive: true },
    });

    if (!shift) {
      return false;
    }

    const shiftStart = this.toUtcDate(reservationDate, shift.startsAt);
    const shiftEnd = this.toUtcDate(reservationDate, shift.endsAt);
    const startsAt = now > shiftStart ? now : shiftStart;
    const defaultDurationMinutes = 90;
    const endsAt = new Date(
      Math.min(
        shiftEnd.getTime(),
        startsAt.getTime() + defaultDurationMinutes * 60_000,
      ),
    );

    if (endsAt <= startsAt) {
      return false;
    }

    const waitlistRepository = manager.getRepository(WaitlistEntryEntity);
    const reservationRepository = manager.getRepository(ReservationEntity);

    const candidates = await waitlistRepository
      .createQueryBuilder('waitlist')
      .setLock('pessimistic_write')
      .where('waitlist.requestedDate = :reservationDate', { reservationDate })
      .andWhere('waitlist.requestedShiftId = :shiftId', { shiftId: shift.id })
      .andWhere('waitlist.partySize <= :tableCapacity', {
        tableCapacity: table.capacity,
      })
      .andWhere('waitlist.status IN (:...statuses)', {
        statuses: ACTIVE_WAITLIST_STATUSES,
      })
      .orderBy('waitlist.position', 'ASC', 'NULLS LAST')
      .addOrderBy('waitlist.createdAt', 'ASC')
      .addOrderBy('waitlist.id', 'ASC')
      .getMany();

    for (const candidate of candidates) {
      const existingReservation = await reservationRepository.findOne({
        where: {
          customerId: candidate.customerId,
          shiftId: shift.id,
          reservationDate,
          status: In(ACTIVE_RESERVATION_STATUSES),
        },
      });

      if (
        existingReservation &&
        existingReservation.tableId &&
        existingReservation.tableId !== table.id
      ) {
        continue;
      }

      if (existingReservation) {
        existingReservation.tableId = table.id;
        await reservationRepository.save(existingReservation);
      } else {
        const createdReservation = reservationRepository.create({
          customerId: candidate.customerId,
          tableId: table.id,
          shiftId: shift.id,
          reservationDate,
          startsAt,
          endsAt,
          partySize: candidate.partySize,
          status: ReservationStatus.Confirmed,
          notes: candidate.notes ?? null,
          specialRequests: null,
          createdByUserId: null,
        });
        await reservationRepository.save(createdReservation);
      }

      await waitlistRepository.delete(candidate.id);
      return true;
    }

    return false;
  }

  private resolveCurrentSlot(now: Date): ShiftSlot | null {
    const currentTime = now.toISOString().slice(11, 19);

    if (
      currentTime >= SHIFT_SLOT_WINDOWS.matutino.startsAt &&
      currentTime < SHIFT_SLOT_WINDOWS.matutino.endsAt
    ) {
      return 'matutino';
    }

    if (
      currentTime >= SHIFT_SLOT_WINDOWS.vespertino.startsAt &&
      currentTime < SHIFT_SLOT_WINDOWS.vespertino.endsAt
    ) {
      return 'vespertino';
    }

    return null;
  }

  private toUtcDate(date: string, time: string): Date {
    return new Date(`${date}T${time}Z`);
  }
}
