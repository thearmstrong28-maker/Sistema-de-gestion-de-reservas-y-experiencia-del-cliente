import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class FrequentCustomersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minVisits?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
