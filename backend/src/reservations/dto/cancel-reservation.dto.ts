import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length } from 'class-validator';

export class CancelReservationDto {
  @IsOptional()
  @IsString({ message: 'El motivo de cancelación debe ser un texto válido.' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Length(3, 255, {
    message: 'El motivo de cancelación debe tener entre 3 y 255 caracteres.',
  })
  reason?: string;
}
