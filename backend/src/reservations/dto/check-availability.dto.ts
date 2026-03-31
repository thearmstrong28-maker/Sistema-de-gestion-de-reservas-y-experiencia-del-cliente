import { Type } from 'class-transformer';
import { IsDate, IsInt, Min } from 'class-validator';

export class CheckAvailabilityDto {
  @Type(() => Date)
  @IsDate()
  startAt: Date;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  partySize: number;
}
