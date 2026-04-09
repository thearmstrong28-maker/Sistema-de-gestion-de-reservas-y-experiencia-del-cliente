import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyPasswordDto {
  @IsString({ message: 'La contraseña debe ser un texto válido.' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  password: string;
}
