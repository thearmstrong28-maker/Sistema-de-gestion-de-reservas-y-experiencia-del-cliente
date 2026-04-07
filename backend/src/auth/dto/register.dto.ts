import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from '../enums/role.enum';

export class RegisterDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsEmail({}, { message: 'Ingresá un correo electrónico válido.' })
  email: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'El teléfono debe ser un texto válido.' })
  @IsNotEmpty({ message: 'El teléfono es obligatorio.' })
  @Matches(/^\+?(?:[0-9\s().-]*\d){7,15}[0-9\s().-]*$/, {
    message: 'Ingresá un teléfono internacional válido.',
  })
  phone: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'El nombre del restaurante debe ser un texto válido.' })
  @IsNotEmpty({ message: 'El nombre del restaurante es obligatorio.' })
  @MinLength(2, {
    message: 'El nombre del restaurante debe tener al menos 2 caracteres.',
  })
  @MaxLength(120, {
    message: 'El nombre del restaurante no puede superar 120 caracteres.',
  })
  restaurantName: string;

  @IsString({ message: 'La contraseña debe ser un texto válido.' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  @MinLength(8, {
    message: 'La contraseña debe tener al menos 8 caracteres.',
  })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, {
    message:
      'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo.',
  })
  password: string;

  @IsOptional()
  @IsEnum(Role, { message: 'El rol seleccionado no es válido.' })
  role?: Role;
}
