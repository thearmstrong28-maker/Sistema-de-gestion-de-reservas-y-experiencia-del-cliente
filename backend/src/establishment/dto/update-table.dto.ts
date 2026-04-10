import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { TableAvailabilityStatus } from '../../reservations/enums/table-availability-status.enum';

export class UpdateTableDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La capacidad debe ser un número entero.' })
  @Min(1, { message: 'La capacidad debe ser al menos 1.' })
  capacity?: number;

  @IsOptional()
  @IsEnum(TableAvailabilityStatus, {
    message: 'La disponibilidad seleccionada no es válida.',
  })
  availabilityStatus?: TableAvailabilityStatus;
}
