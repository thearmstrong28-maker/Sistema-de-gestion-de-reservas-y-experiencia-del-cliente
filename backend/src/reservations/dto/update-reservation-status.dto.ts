import { IsEnum } from 'class-validator';
import { ReservationStatus } from '../enums/reservation-status.enum';

export class UpdateReservationStatusDto {
  @IsEnum(ReservationStatus, {
    message: 'El estado de la reserva no es válido.',
  })
  status: ReservationStatus;
}
