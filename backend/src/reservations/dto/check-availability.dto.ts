import { Type } from 'class-transformer';
import { IsDate, IsIn, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { DEFAULT_SHIFT_SLOTS, type ShiftSlot } from '../../shifts/shift-slot';

export class CheckAvailabilityDto {
  @IsOptional()
  @IsUUID()
  shiftId?: string;

  @IsOptional()
  @IsIn(DEFAULT_SHIFT_SLOTS)
  turno?: ShiftSlot;

  @Type(() => Date)
  @IsDate()
  startsAt: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endsAt?: Date;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  partySize: number;
}
