import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerEntity } from '../customers/entities/customer.entity';
import { ShiftEntity } from '../shifts/entities/shift.entity';
import {
  buildShiftName,
  extractShiftSlot,
  SHIFT_SLOT_WINDOWS,
  type ShiftSlot,
} from '../shifts/shift-slot';
import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto';
import { ListWaitlistQueryDto } from './dto/list-waitlist.query';
import { UpdateWaitlistEntryDto } from './dto/update-waitlist-entry.dto';
import { WaitlistEntryEntity } from './entities/waitlist-entry.entity';
import {
  ACTIVE_WAITLIST_STATUSES,
  WaitlistStatus,
} from './enums/waitlist-status.enum';

@Injectable()
export class WaitlistService {
  constructor(
    @InjectRepository(WaitlistEntryEntity)
    private readonly waitlistRepository: Repository<WaitlistEntryEntity>,
    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,
    @InjectRepository(ShiftEntity)
    private readonly shiftRepository: Repository<ShiftEntity>,
  ) {}

  async create(
    createWaitlistEntryDto: CreateWaitlistEntryDto,
  ): Promise<WaitlistEntryEntity> {
    await this.ensureCustomerExists(createWaitlistEntryDto.customerId);
    const requestedShift = await this.resolveShift(
      createWaitlistEntryDto.requestedShiftId,
      createWaitlistEntryDto.turno,
      createWaitlistEntryDto.requestedDate,
    );

    const requestedDate = createWaitlistEntryDto.requestedDate
      .toISOString()
      .slice(0, 10);

    const existingEntry = await this.findExistingWaitingEntry(
      createWaitlistEntryDto.customerId,
      requestedDate,
      requestedShift?.id ?? null,
    );

    if (existingEntry) {
      return existingEntry;
    }

    const position =
      createWaitlistEntryDto.position ??
      (await this.getNextPosition(requestedDate, requestedShift?.id));

    const entry = this.waitlistRepository.create({
      customerId: createWaitlistEntryDto.customerId,
      requestedShiftId: requestedShift?.id ?? null,
      requestedDate,
      partySize: createWaitlistEntryDto.partySize,
      notes: createWaitlistEntryDto.notes,
      position,
    });

    return this.saveWaitlistEntry(
      entry,
      createWaitlistEntryDto.customerId,
      requestedDate,
      requestedShift?.id ?? null,
    );
  }

  async list(query: ListWaitlistQueryDto): Promise<WaitlistEntryEntity[]> {
    const requestedDate = query.date?.toISOString().slice(0, 10);

    return this.waitlistRepository.find({
      where: {
        ...(requestedDate ? { requestedDate } : {}),
        ...(query.shiftId ? { requestedShiftId: query.shiftId } : {}),
      },
      relations: { customer: true, requestedShift: true },
      order: {
        position: 'ASC',
        createdAt: 'ASC',
        id: 'ASC',
      },
    });
  }

  async update(
    id: string,
    updateWaitlistEntryDto: UpdateWaitlistEntryDto,
  ): Promise<WaitlistEntryEntity> {
    const entry = await this.waitlistRepository.findOne({ where: { id } });
    if (!entry) {
      throw new NotFoundException('Waitlist entry not found');
    }

    entry.status = updateWaitlistEntryDto.status ?? entry.status;
    entry.position = updateWaitlistEntryDto.position ?? entry.position;
    entry.notes = updateWaitlistEntryDto.notes ?? entry.notes;

    return this.waitlistRepository.save(entry);
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

  private async resolveShift(
    shiftId: string | undefined,
    turno: ShiftSlot | undefined,
    requestedDate: Date,
  ): Promise<ShiftEntity | null> {
    if (shiftId) {
      const shift = await this.shiftRepository.findOne({
        where: { id: shiftId, isActive: true },
      });
      if (!shift) {
        throw new NotFoundException('Shift not found or inactive');
      }

      return shift;
    }

    if (!turno) {
      return null;
    }

    const shiftDate = requestedDate.toISOString().slice(0, 10);
    const shiftName = buildShiftName(shiftDate, turno);
    const window = SHIFT_SLOT_WINDOWS[turno];

    const existing = await this.shiftRepository.findOne({
      where: { shiftName },
    });

    if (existing) {
      const existingSlot = extractShiftSlot(existing.shiftName);
      const existingWindow = existingSlot
        ? SHIFT_SLOT_WINDOWS[existingSlot]
        : window;
      const shouldNormalize =
        existing.shiftDate !== shiftDate ||
        existing.startsAt !== existingWindow.startsAt ||
        existing.endsAt !== existingWindow.endsAt ||
        !existing.isActive;

      if (shouldNormalize) {
        existing.isActive = true;
        existing.shiftDate = shiftDate;
        existing.startsAt = existingWindow.startsAt;
        existing.endsAt = existingWindow.endsAt;
        return this.shiftRepository.save(existing);
      }

      return existing;
    }

    return this.shiftRepository.save(
      this.shiftRepository.create({
        shiftName,
        shiftDate,
        startsAt: window.startsAt,
        endsAt: window.endsAt,
        isActive: true,
      }),
    );
  }

  private async getNextPosition(
    requestedDate: string,
    requestedShiftId?: string,
  ): Promise<number> {
    const rows = await this.waitlistRepository
      .createQueryBuilder('w')
      .select('COALESCE(MAX(w.position), 0)', 'maxPosition')
      .where('w.requested_date = :requestedDate', { requestedDate })
      .andWhere(
        requestedShiftId
          ? 'w.requested_shift_id = :requestedShiftId'
          : 'w.requested_shift_id IS NULL',
        { requestedShiftId },
      )
      .andWhere('w.status IN (:...statuses)', {
        statuses: ACTIVE_WAITLIST_STATUSES,
      })
      .getRawOne<{ maxPosition: string }>();

    return Number(rows?.maxPosition ?? 0) + 1;
  }

  private async findExistingWaitingEntry(
    customerId: string,
    requestedDate: string,
    requestedShiftId: string | null,
  ): Promise<WaitlistEntryEntity | null> {
    return this.waitlistRepository.findOne({
      where: {
        customerId,
        requestedDate,
        requestedShiftId,
        status: WaitlistStatus.Waiting,
      },
    });
  }

  private async saveWaitlistEntry(
    entry: WaitlistEntryEntity,
    customerId: string,
    requestedDate: string,
    requestedShiftId: string | null,
  ): Promise<WaitlistEntryEntity> {
    try {
      return await this.waitlistRepository.save(entry);
    } catch (error) {
      if (this.isPostgresConstraintError(error, '23505')) {
        const fallback = await this.findExistingWaitingEntry(
          customerId,
          requestedDate,
          requestedShiftId,
        );

        if (fallback) {
          return fallback;
        }
      }

      throw error;
    }
  }

  private isPostgresConstraintError(error: unknown, code: string): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const maybe = error as { code?: string; driverError?: { code?: string } };
    return maybe.code === code || maybe.driverError?.code === code;
  }
}
