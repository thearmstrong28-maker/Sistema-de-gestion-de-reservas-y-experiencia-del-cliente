import { IsEnum } from 'class-validator';
import { TableAvailabilityStatus } from '../../reservations/enums/table-availability-status.enum';

export class UpdateTableAvailabilityDto {
  @IsEnum(TableAvailabilityStatus, {
    message: 'La disponibilidad seleccionada no es válida.',
  })
  availabilityStatus: TableAvailabilityStatus;
}
