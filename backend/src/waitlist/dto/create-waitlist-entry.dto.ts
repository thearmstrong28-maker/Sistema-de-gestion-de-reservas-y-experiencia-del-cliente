import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateWaitlistEntryDto {
  @IsUUID()
  customerId: string;

  @IsOptional()
  @IsUUID()
  requestedShiftId?: string;

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
