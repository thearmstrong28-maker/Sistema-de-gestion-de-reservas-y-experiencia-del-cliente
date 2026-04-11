import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShiftEntity } from './entities/shift.entity';
import { getShiftWindow } from './shift-slot';

@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(ShiftEntity)
    private readonly shiftRepository: Repository<ShiftEntity>,
  ) {}

  listActive(): Promise<ShiftEntity[]> {
    return this.shiftRepository
      .find({
        where: { isActive: true },
        order: { shiftDate: 'ASC', startsAt: 'ASC' },
      })
      .then((shifts) =>
        shifts.map((shift) => {
          const window = getShiftWindow(shift.shiftName);

          if (!window) {
            return shift;
          }

          return {
            ...shift,
            startsAt: window.startsAt,
            endsAt: window.endsAt,
          };
        }),
      );
  }
}
