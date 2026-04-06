import { Type } from 'class-transformer';
import {
  IsDate,
  IsOptional,
  IsInt,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateReservationDto {
  @IsUUID()
  customerId: string;

  @IsUUID()
  shiftId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  partySize: number;

  @Type(() => Date)
  @IsDate()
  startsAt: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endsAt?: Date;

  @IsOptional()
  @IsUUID()
  tableId?: string;

  @IsOptional()
  @IsString()
  specialRequests?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
