import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class CheckAvailabilityDto {
  @IsUUID()
  shiftId: string;

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
