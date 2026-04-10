import { Transform } from 'class-transformer';
import { IsString, MinLength } from 'class-validator';

export class LoginManagerDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'El nombre registrado debe ser un texto válido.' })
  @MinLength(2, {
    message: 'El nombre registrado debe tener al menos 2 caracteres.',
  })
  fullName: string;

  @IsString({ message: 'La contraseña debe ser un texto válido.' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  password: string;
}
