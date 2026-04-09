import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';

export class DailySummaryQueryDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'La fecha debe ser válida.' })
  date?: Date;
}
