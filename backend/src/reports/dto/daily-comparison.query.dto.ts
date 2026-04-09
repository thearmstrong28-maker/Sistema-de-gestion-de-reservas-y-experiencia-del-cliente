import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, Max, Min } from 'class-validator';

export class DailyComparisonQueryDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'La fecha debe ser válida.' })
  date?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La cantidad de días debe ser un número entero.' })
  @Min(1, { message: 'La cantidad de días debe ser al menos 1.' })
  @Max(30, { message: 'La cantidad de días no puede superar 30.' })
  days?: number;
}
