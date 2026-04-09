import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsUUID } from 'class-validator';

export class DailyOccupancyQueryDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'La fecha debe ser válida.' })
  date?: Date;

  @IsOptional()
  @IsUUID('4', { message: 'El turno seleccionado no es válido.' })
  shiftId?: string;
}
