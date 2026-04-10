import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { DEFAULT_SHIFT_SLOTS, type ShiftSlot } from '../../shifts/shift-slot';

export class CreateWaitlistEntryDto {
  @IsUUID()
  customerId: string;

  @IsOptional()
  @IsUUID()
  requestedShiftId?: string;

  @IsOptional()
  @IsIn(DEFAULT_SHIFT_SLOTS)
  turno?: ShiftSlot;

  @Type(() => Date)
  @IsDate()
  requestedDate: Date;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  partySize: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  position?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
