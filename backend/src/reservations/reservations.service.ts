import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsWhere,
  In,
  LessThan,
  MoreThan,
  Not,
  Repository,
} from 'typeorm';
import { CustomerEntity } from '../customers/entities/customer.entity';
import { ShiftEntity } from '../shifts/entities/shift.entity';
import { AssignTableDto } from './dto/assign-table.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import {
  ACTIVE_RESERVATION_STATUSES,
  ReservationStatus,
} from './enums/reservation-status.enum';
import { ReservationEntity } from './entities/reservation.entity';
import { RestaurantTableEntity } from './entities/table.entity';
import { TableAvailabilityStatus } from './enums/table-availability-status.enum';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(ReservationEntity)
    private readonly reservationRepository: Repository<ReservationEntity>,
    @InjectRepository(RestaurantTableEntity)
    private readonly tableRepository: Repository<RestaurantTableEntity>,
    @InjectRepository(ShiftEntity)
    private readonly shiftRepository: Repository<ShiftEntity>,
    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,
    private readonly configService: ConfigService,
  ) {}

  async create(
    createReservationDto: CreateReservationDto,
    createdByUserId: string,
  ): Promise<ReservationEntity> {
    await this.ensureCustomerExists(createReservationDto.customerId);

    const shift = await this.getShiftOrThrow(createReservationDto.shiftId);
    const { startsAt, endsAt, reservationDate } = this.resolveReservationTiming(
      {
        startsAt: createReservationDto.startsAt,
        endsAt: createReservationDto.endsAt,
      },
    );

    this.validateReservationWindow(startsAt);
    this.validateReservationAgainstShift(
      shift,
      startsAt,
      endsAt,
      reservationDate,
    );

    await this.ensureUniqueActiveCustomerShiftReservation(
      createReservationDto.customerId,
      shift.id,
      reservationDate,
    );

    const table = await this.resolveTableAssignment({
      shiftId: shift.id,
      partySize: createReservationDto.partySize,
      startsAt,
      endsAt,
      preferredTableId: createReservationDto.tableId,
      allowFallbackWhenPreferredUnavailable: false,
    });

    const reservation = this.reservationRepository.create({
      customerId: createReservationDto.customerId,
      tableId: table?.id ?? null,
      shiftId: shift.id,
      reservationDate,
      startsAt,
      endsAt,
      partySize: createReservationDto.partySize,
      specialRequests: createReservationDto.specialRequests,
      notes: createReservationDto.notes,
      status: ReservationStatus.Pending,
      createdByUserId,
    });

    return this.saveReservation(reservation);
  }

  async update(
    id: string,
    updateReservationDto: UpdateReservationDto,
  ): Promise<ReservationEntity> {
    const reservation = await this.getReservationOrThrow(id);
    if (!ACTIVE_RESERVATION_STATUSES.includes(reservation.status)) {
      throw new BadRequestException('Only active reservations can be updated');
    }

    if (updateReservationDto.customerId) {
      await this.ensureCustomerExists(updateReservationDto.customerId);
    }

    const shift = await this.getShiftOrThrow(
      updateReservationDto.shiftId ?? reservation.shiftId,
    );

    const durationMs =
      reservation.endsAt.getTime() - reservation.startsAt.getTime();
    const { startsAt, endsAt, reservationDate } = this.resolveReservationTiming(
      {
        startsAt: updateReservationDto.startsAt ?? reservation.startsAt,
        endsAt:
          updateReservationDto.endsAt ??
          (updateReservationDto.startsAt
            ? new Date(updateReservationDto.startsAt.getTime() + durationMs)
            : reservation.endsAt),
      },
    );

    this.validateReservationWindow(startsAt);
    this.validateReservationAgainstShift(
      shift,
      startsAt,
      endsAt,
      reservationDate,
    );

    await this.ensureUniqueActiveCustomerShiftReservation(
      updateReservationDto.customerId ?? reservation.customerId,
      shift.id,
      reservationDate,
      reservation.id,
    );

    const table = await this.resolveTableAssignment({
      shiftId: shift.id,
      partySize: updateReservationDto.partySize ?? reservation.partySize,
      startsAt,
      endsAt,
      preferredTableId:
        updateReservationDto.tableId === undefined
          ? (reservation.tableId ?? undefined)
          : updateReservationDto.tableId,
      allowFallbackWhenPreferredUnavailable:
        updateReservationDto.tableId === undefined,
      reservationIdToExclude: reservation.id,
    });

    reservation.customerId =
      updateReservationDto.customerId ?? reservation.customerId;
    reservation.shiftId = shift.id;
    reservation.reservationDate = reservationDate;
    reservation.startsAt = startsAt;
    reservation.endsAt = endsAt;
    reservation.partySize =
      updateReservationDto.partySize ?? reservation.partySize;
    reservation.tableId = table?.id ?? null;
    reservation.specialRequests =
      updateReservationDto.specialRequests ?? reservation.specialRequests;
    reservation.notes = updateReservationDto.notes ?? reservation.notes;

    return this.saveReservation(reservation);
  }

  async cancel(id: string): Promise<ReservationEntity> {
    const reservation = await this.getReservationOrThrow(id);
    this.assertReservationIsActiveForStatusChange(reservation);
    reservation.status = ReservationStatus.Cancelled;
    return this.saveReservation(reservation);
  }

  async markNoShow(id: string): Promise<ReservationEntity> {
    const reservation = await this.getReservationOrThrow(id);
    this.assertReservationIsActiveForStatusChange(reservation);
    reservation.status = ReservationStatus.NoShow;
    return this.saveReservation(reservation);
  }

  async assignTable(
    id: string,
    assignTableDto: AssignTableDto,
  ): Promise<ReservationEntity> {
    const reservation = await this.getReservationOrThrow(id);
    if (!ACTIVE_RESERVATION_STATUSES.includes(reservation.status)) {
      throw new BadRequestException('Only active reservations can be assigned');
    }

    const table = await this.resolveTableAssignment({
      shiftId: reservation.shiftId,
      partySize: reservation.partySize,
      startsAt: reservation.startsAt,
      endsAt: reservation.endsAt,
      preferredTableId: assignTableDto.tableId,
      allowFallbackWhenPreferredUnavailable: !assignTableDto.tableId,
      reservationIdToExclude: reservation.id,
    });

    reservation.tableId = table?.id ?? null;
    return this.saveReservation(reservation);
  }

  async getAvailability(query: CheckAvailabilityDto): Promise<{
    shiftId: string;
    startsAt: Date;
    endsAt: Date;
    partySize: number;
    available: boolean;
    recommendedTableId: string | null;
    availableTables: Array<{
      id: string;
      tableNumber: number;
      capacity: number;
      area: string | null;
    }>;
  }> {
    const shift = await this.getShiftOrThrow(query.shiftId);

    const { startsAt, endsAt, reservationDate } = this.resolveReservationTiming(
      {
        startsAt: query.startsAt,
        endsAt: query.endsAt,
      },
    );

    this.validateReservationWindow(startsAt);
    this.validateReservationAgainstShift(
      shift,
      startsAt,
      endsAt,
      reservationDate,
    );

    const tables = await this.tableRepository.find({
      where: {
        isActive: true,
        availabilityStatus: TableAvailabilityStatus.Disponible,
        capacity: MoreThan(query.partySize - 1),
      },
      order: { capacity: 'ASC', tableNumber: 'ASC' },
    });

    const availableTables: Array<{
      id: string;
      tableNumber: number;
      capacity: number;
      area: string | null;
    }> = [];

    for (const table of tables) {
      const occupied = await this.isTableOccupied(
        table.id,
        startsAt,
        endsAt,
        undefined,
        shift.id,
      );
      if (!occupied) {
        availableTables.push({
          id: table.id,
          tableNumber: table.tableNumber,
          capacity: table.capacity,
          area: table.area ?? null,
        });
      }
    }

    return {
      shiftId: shift.id,
      startsAt,
      endsAt,
      partySize: query.partySize,
      available: availableTables.length > 0,
      recommendedTableId: availableTables[0]?.id ?? null,
      availableTables,
    };
  }

  private resolveReservationTiming({
    startsAt,
    endsAt,
  }: {
    startsAt: Date;
    endsAt?: Date;
  }): { startsAt: Date; endsAt: Date; reservationDate: string } {
    const defaultDurationMinutes = this.getNumberConfig(
      'RESERVATION_DEFAULT_DURATION_MINUTES',
      90,
    );
    const normalizedStart = new Date(startsAt);
    const normalizedEnd = endsAt
      ? new Date(endsAt)
      : new Date(normalizedStart.getTime() + defaultDurationMinutes * 60_000);

    if (Number.isNaN(normalizedStart.getTime())) {
      throw new BadRequestException('Invalid startsAt value');
    }
    if (Number.isNaN(normalizedEnd.getTime())) {
      throw new BadRequestException('Invalid endsAt value');
    }
    if (normalizedEnd <= normalizedStart) {
      throw new BadRequestException('Reservation end must be after start');
    }

    const reservationDate = normalizedStart.toISOString().slice(0, 10);
    return {
      startsAt: normalizedStart,
      endsAt: normalizedEnd,
      reservationDate,
    };
  }

  private validateReservationWindow(startsAt: Date): void {
    const now = new Date();
    const maxDaysAhead = this.getNumberConfig('RESERVATION_MAX_DAYS_AHEAD', 30);
    const toleranceMinutes = this.getNumberConfig(
      'RESERVATION_ARRIVAL_TOLERANCE_MINUTES',
      15,
    );

    const earliestAllowed = new Date(now.getTime() - toleranceMinutes * 60_000);
    const latestAllowed = new Date(
      now.getTime() + maxDaysAhead * 24 * 60 * 60_000,
    );

    if (startsAt < earliestAllowed) {
      throw new BadRequestException(
        'Reservation start is outside allowed window',
      );
    }
    if (startsAt > latestAllowed) {
      throw new BadRequestException(
        'Reservation exceeds max days ahead window',
      );
    }
  }

  private validateReservationAgainstShift(
    shift: ShiftEntity,
    startsAt: Date,
    endsAt: Date,
    reservationDate: string,
  ): void {
    if (reservationDate !== shift.shiftDate) {
      throw new BadRequestException('Reservation date must match shift date');
    }

    const startTime = startsAt.toISOString().slice(11, 19);
    const endTime = endsAt.toISOString().slice(11, 19);
    const shiftStart = `${shift.startsAt}:00`.slice(0, 8);
    const shiftEnd = `${shift.endsAt}:00`.slice(0, 8);

    if (startTime < shiftStart || endTime > shiftEnd) {
      throw new BadRequestException('Reservation is outside shift hours');
    }
  }

  private async resolveTableAssignment({
    shiftId,
    partySize,
    startsAt,
    endsAt,
    preferredTableId,
    allowFallbackWhenPreferredUnavailable,
    reservationIdToExclude,
  }: {
    shiftId: string;
    partySize: number;
    startsAt: Date;
    endsAt: Date;
    preferredTableId?: string;
    allowFallbackWhenPreferredUnavailable: boolean;
    reservationIdToExclude?: string;
  }): Promise<RestaurantTableEntity | null> {
    if (preferredTableId) {
      const preferred = await this.tableRepository.findOne({
        where: { id: preferredTableId, isActive: true },
      });
      if (!preferred) {
        throw new NotFoundException('Requested table not found or inactive');
      }

      if (preferred.availabilityStatus === TableAvailabilityStatus.Ocupada) {
        throw new ConflictException(
          'Requested table is not available for this slot',
        );
      }

      const preferredIsValid =
        preferred.capacity >= partySize &&
        !(await this.isTableOccupied(
          preferred.id,
          startsAt,
          endsAt,
          reservationIdToExclude,
          shiftId,
        ));

      if (preferredIsValid) {
        return preferred;
      }

      if (!allowFallbackWhenPreferredUnavailable) {
        throw new ConflictException(
          'Requested table is not available for this slot',
        );
      }
    }

    const candidates = await this.tableRepository.find({
      where: {
        isActive: true,
        availabilityStatus: TableAvailabilityStatus.Disponible,
        capacity: MoreThan(partySize - 1),
      },
      order: {
        capacity: 'ASC',
        tableNumber: 'ASC',
      },
    });

    for (const table of candidates) {
      const occupied = await this.isTableOccupied(
        table.id,
        startsAt,
        endsAt,
        reservationIdToExclude,
        shiftId,
      );
      if (!occupied) {
        return table;
      }
    }

    throw new ConflictException(
      'No available table matches the requested slot',
    );
  }

  private async isTableOccupied(
    tableId: string,
    startsAt: Date,
    endsAt: Date,
    reservationIdToExclude?: string,
    shiftId?: string,
  ): Promise<boolean> {
    const where: FindOptionsWhere<ReservationEntity> = {
      tableId,
      startsAt: LessThan(endsAt),
      endsAt: MoreThan(startsAt),
      status: In(ACTIVE_RESERVATION_STATUSES),
    };

    if (shiftId) {
      where.shiftId = shiftId;
    }

    if (reservationIdToExclude) {
      where.id = Not(reservationIdToExclude);
    }

    const count = await this.reservationRepository.count({ where });
    return count > 0;
  }

  private async ensureUniqueActiveCustomerShiftReservation(
    customerId: string,
    shiftId: string,
    reservationDate: string,
    reservationIdToExclude?: string,
  ): Promise<void> {
    const where: FindOptionsWhere<ReservationEntity> = {
      customerId,
      shiftId,
      reservationDate,
      status: In(ACTIVE_RESERVATION_STATUSES),
    };

    if (reservationIdToExclude) {
      where.id = Not(reservationIdToExclude);
    }

    const existing = await this.reservationRepository.findOne({ where });
    if (existing) {
      throw new ConflictException(
        'Customer already has an active reservation for this shift and date',
      );
    }
  }

  private async getReservationOrThrow(id: string): Promise<ReservationEntity> {
    const reservation = await this.reservationRepository.findOne({
      where: { id },
    });
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }
    return reservation;
  }

  private assertReservationIsActiveForStatusChange(
    reservation: ReservationEntity,
  ): void {
    if (!ACTIVE_RESERVATION_STATUSES.includes(reservation.status)) {
      throw new BadRequestException(
        'Only active reservations can change to cancelled/no-show',
      );
    }
  }

  private async getShiftOrThrow(id: string): Promise<ShiftEntity> {
    const shift = await this.shiftRepository.findOne({
      where: { id, isActive: true },
    });
    if (!shift) {
      throw new NotFoundException('Shift not found or inactive');
    }
    return shift;
  }

  private async ensureCustomerExists(customerId: string): Promise<void> {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
      select: { id: true },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
  }

  private async saveReservation(
    reservation: ReservationEntity,
  ): Promise<ReservationEntity> {
    try {
      return await this.reservationRepository.save(reservation);
    } catch (error) {
      if (this.isPostgresConstraintError(error, '23505')) {
        throw new ConflictException('Reservation conflicts with existing data');
      }
      if (this.isPostgresConstraintError(error, '23P01')) {
        throw new ConflictException(
          'Table is already occupied in that time slot',
        );
      }

      throw error;
    }
  }

  private getNumberConfig(key: string, fallback: number): number {
    const raw = this.configService.get<string | number>(key, fallback);
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private isPostgresConstraintError(error: unknown, code: string): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const maybe = error as { code?: string; driverError?: { code?: string } };
    return maybe.code === code || maybe.driverError?.code === code;
  }
}
