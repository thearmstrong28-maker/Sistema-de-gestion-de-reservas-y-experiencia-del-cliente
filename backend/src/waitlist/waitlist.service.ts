import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerEntity } from '../customers/entities/customer.entity';
import { ShiftEntity } from '../shifts/entities/shift.entity';
import {
  buildShiftName,
  SHIFT_SLOT_WINDOWS,
  type ShiftSlot,
} from '../shifts/shift-slot';
import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto';
import { ListWaitlistQueryDto } from './dto/list-waitlist.query';
import { UpdateWaitlistEntryDto } from './dto/update-waitlist-entry.dto';
import { WaitlistEntryEntity } from './entities/waitlist-entry.entity';
import { ACTIVE_WAITLIST_STATUSES } from './enums/waitlist-status.enum';

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

    return this.waitlistRepository.save(entry);
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
      if (!existing.isActive) {
        existing.isActive = true;
        existing.shiftDate = shiftDate;
        existing.startsAt = window.startsAt;
        existing.endsAt = window.endsAt;
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
}
