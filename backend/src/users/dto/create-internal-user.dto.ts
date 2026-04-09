import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from '../../auth/enums/role.enum';

const INTERNAL_ROLES = [Role.Host, Role.Manager] as const;

export class CreateInternalUserDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsEmail({}, { message: 'Ingresá un correo electrónico válido.' })
  email?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'El nombre completo debe ser un texto válido.' })
  @IsNotEmpty({ message: 'El nombre completo es obligatorio.' })
  @MaxLength(120, {
    message: 'El nombre completo no puede superar 120 caracteres.',
  })
  fullName: string;

  @IsString({ message: 'La contraseña debe ser un texto válido.' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  @MinLength(6, {
    message: 'La contraseña debe tener al menos 6 caracteres.',
  })
  password: string;

  @IsIn(INTERNAL_ROLES, {
    message: 'El rol seleccionado no es válido.',
  })
  role: (typeof INTERNAL_ROLES)[number];

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser un texto válido.' })
  @MaxLength(30, {
    message: 'El teléfono no puede superar 30 caracteres.',
  })
  phone?: string;
}
