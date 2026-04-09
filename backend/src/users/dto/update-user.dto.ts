import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Role } from '../../auth/enums/role.enum';

const EDITABLE_ROLES = [Role.Host, Role.Manager, Role.Customer] as const;

const normalizeOptionalText = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export class UpdateUserDto {
  @Transform(normalizeOptionalText)
  @IsOptional()
  @IsString({ message: 'El nombre completo debe ser un texto válido.' })
  @MaxLength(120, {
    message: 'El nombre completo no puede superar 120 caracteres.',
  })
  fullName?: string;

  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmed = value.trim().toLowerCase();
    return trimmed.length > 0 ? trimmed : undefined;
  })
  @IsOptional()
  @IsEmail({}, { message: 'Ingresá un correo electrónico válido.' })
  email?: string;

  @Transform(normalizeOptionalText)
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser un texto válido.' })
  @MaxLength(30, {
    message: 'El teléfono no puede superar 30 caracteres.',
  })
  phone?: string;

  @Transform(normalizeOptionalText)
  @IsOptional()
  @IsIn(EDITABLE_ROLES, {
    message: 'El rol seleccionado no es válido.',
  })
  role?: (typeof EDITABLE_ROLES)[number];
}
