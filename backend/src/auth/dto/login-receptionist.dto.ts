import { Transform } from 'class-transformer';
import { IsString, MinLength } from 'class-validator';

export class LoginReceptionistDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({
    message: 'Ingresá tu nombre registrado o correo electrónico.',
  })
  @MinLength(2, {
    message:
      'El nombre registrado o correo electrónico debe tener al menos 2 caracteres.',
  })
  identifier: string;

  @IsString({ message: 'La contraseña debe ser un texto válido.' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  password: string;
}
