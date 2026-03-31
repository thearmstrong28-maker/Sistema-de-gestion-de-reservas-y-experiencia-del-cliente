import {
  BadRequestException,
  ConflictException,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, MoreThan, Repository } from 'typeorm';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { ReservationEntity } from './entities/reservation.entity';
import { TableEntity } from './entities/table.entity';
import {
  ACTIVE_RESERVATION_STATUSES,
  ReservationStatus,
} from './enums/reservation-status.enum';

interface ReservationSettings {
  maxDaysAhead: number;
  arrivalToleranceMinutes: number;
  defaultDurationMinutes: number;
}

interface AvailableTableView {
  id: string;
  number: number;
  name: string;
  capacity: number;
}

@Injectable()
export class ReservationsService implements OnModuleInit {
  constructor(
    @InjectRepository(TableEntity)
    private readonly tableRepository: Repository<TableEntity>,
    @InjectRepository(ReservationEntity)
    private readonly reservationRepository: Repository<ReservationEntity>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaultTablesIfNeeded();
  }

  async reserveTable(
    dto: CreateReservationDto,
    createdBy: string,
  ): Promise<ReservationEntity> {
    const settings = this.getReservationSettings();
    const startAt = new Date(dto.startAt);
    const now = new Date();

    this.assertWithinReservationWindow(startAt, now, settings.maxDaysAhead);

    const endAt = this.addMinutes(startAt, settings.defaultDurationMinutes);
    const arrivalDeadlineAt = this.addMinutes(
      startAt,
      -settings.arrivalToleranceMinutes,
    );

    const selectedTable = await this.findBestFitAvailableTable(
      dto.partySize,
      startAt,
      endAt,
    );

    if (!selectedTable) {
      throw new ConflictException(
        `No available table found for party size ${dto.partySize} at the requested time.`,
      );
    }

    const reservation = this.reservationRepository.create({
      customerName: dto.customerName,
      customerRef: dto.customerRef,
      partySize: dto.partySize,
      startAt,
      endAt,
      arrivalDeadlineAt,
      status: ReservationStatus.Confirmed,
      tableId: selectedTable.id,
      createdBy,
    });

    return this.reservationRepository.save(reservation);
  }

  async getAvailability(dto: CheckAvailabilityDto): Promise<{
    available: boolean;
    startAt: Date;
    endAt: Date;
    arrivalDeadlineAt: Date;
    partySize: number;
    availableTables: AvailableTableView[];
    selectedTable: AvailableTableView | null;
  }> {
    const settings = this.getReservationSettings();
    const startAt = new Date(dto.startAt);
    const now = new Date();

    this.assertWithinReservationWindow(startAt, now, settings.maxDaysAhead);

    const endAt = this.addMinutes(startAt, settings.defaultDurationMinutes);
    const arrivalDeadlineAt = this.addMinutes(
      startAt,
      -settings.arrivalToleranceMinutes,
    );
    const availableTables = await this.findAvailableTableViews(
      dto.partySize,
      startAt,
      endAt,
    );

    return {
      available: availableTables.length > 0,
      startAt,
      endAt,
      arrivalDeadlineAt,
      partySize: dto.partySize,
      availableTables,
      selectedTable: availableTables[0] ?? null,
    };
  }

  private async seedDefaultTablesIfNeeded(): Promise<void> {
    const existingTables = await this.tableRepository.count();

    if (existingTables > 0) {
      return;
    }

    await this.tableRepository.save(
      this.tableRepository.create([
        { number: 1, name: 'Table 1', capacity: 2, isActive: true },
        { number: 2, name: 'Table 2', capacity: 4, isActive: true },
        { number: 3, name: 'Table 3', capacity: 4, isActive: true },
        { number: 4, name: 'Table 4', capacity: 6, isActive: true },
      ]),
    );
  }

  private async findBestFitAvailableTable(
    partySize: number,
    startAt: Date,
    endAt: Date,
  ): Promise<TableEntity | null> {
    const availableTables = await this.findAvailableTableDocuments(
      partySize,
      startAt,
      endAt,
    );

    return availableTables[0] ?? null;
  }

  private async findAvailableTableDocuments(
    partySize: number,
    startAt: Date,
    endAt: Date,
  ): Promise<TableEntity[]> {
    const candidateTables = await this.tableRepository.find({
      where: { isActive: true, capacity: MoreThan(partySize - 1) },
      order: { capacity: 'ASC', number: 'ASC' },
    });

    if (candidateTables.length === 0) {
      return [];
    }

    const candidateIds = candidateTables.map((table) => table.id);
    const overlappingReservations = await this.reservationRepository.find({
      where: {
        tableId: In(candidateIds),
        status: In(ACTIVE_RESERVATION_STATUSES),
        startAt: LessThan(endAt),
        endAt: MoreThan(startAt),
      },
    });

    const occupiedTableIds = new Set(
      overlappingReservations.map((reservation) => String(reservation.tableId)),
    );

    return candidateTables.filter(
      (table) => !occupiedTableIds.has(String(table.id)),
    );
  }

  private async findAvailableTableViews(
    partySize: number,
    startAt: Date,
    endAt: Date,
  ): Promise<AvailableTableView[]> {
    const availableTables = await this.findAvailableTableDocuments(
      partySize,
      startAt,
      endAt,
    );

    return availableTables.map((table) => ({
      id: String(table.id),
      number: table.number,
      name: table.name,
      capacity: table.capacity,
    }));
  }

  private getReservationSettings(): ReservationSettings {
    return {
      maxDaysAhead: this.getConfigNumber('RESERVATION_MAX_DAYS_AHEAD', 30),
      arrivalToleranceMinutes: this.getConfigNumber(
        'RESERVATION_ARRIVAL_TOLERANCE_MINUTES',
        15,
      ),
      defaultDurationMinutes: this.getConfigNumber(
        'RESERVATION_DEFAULT_DURATION_MINUTES',
        90,
      ),
    };
  }

  private getConfigNumber(key: string, fallback: number): number {
    const value = this.configService.get<string | number | undefined>(key);
    const parsed = typeof value === 'number' ? value : Number(value);

    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }

  private assertWithinReservationWindow(
    startAt: Date,
    now: Date,
    maxDaysAhead: number,
  ): void {
    if (Number.isNaN(startAt.getTime())) {
      throw new BadRequestException('startAt must be a valid date');
    }

    if (startAt.getTime() < now.getTime()) {
      throw new BadRequestException(
        'Reservation start time must be in the future',
      );
    }

    const maxStartAt = this.addDays(now, maxDaysAhead);

    if (startAt.getTime() > maxStartAt.getTime()) {
      throw new BadRequestException(
        `Reservations can only be created up to ${maxDaysAhead} days in advance`,
      );
    }
  }

  private addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60_000);
  }

  private addDays(date: Date, days: number): Date {
    return this.addMinutes(date, days * 24 * 60);
  }
}
