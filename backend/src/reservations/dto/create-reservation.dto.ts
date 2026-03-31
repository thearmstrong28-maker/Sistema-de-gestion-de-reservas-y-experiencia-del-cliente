import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReservationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  customerName: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  customerRef?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  partySize: number;

  @Type(() => Date)
  @IsDate()
  startAt: Date;
}
