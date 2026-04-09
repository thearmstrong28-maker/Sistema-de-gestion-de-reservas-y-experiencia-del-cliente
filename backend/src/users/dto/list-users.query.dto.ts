import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { Role } from '../../auth/enums/role.enum';

const LISTABLE_ROLES = [Role.Customer, Role.Host, Role.Manager] as const;

const parseBoolean = (value: unknown): unknown => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1 ? true : value === 0 ? false : value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (['true', '1', 'si', 'sí'].includes(normalized)) {
      return true;
    }

    if (['false', '0', 'no'].includes(normalized)) {
      return false;
    }
  }

  return value;
};

export class ListUsersQueryDto {
  @IsOptional()
  @IsIn(LISTABLE_ROLES, { message: 'El rol seleccionado no es válido.' })
  role?: (typeof LISTABLE_ROLES)[number];

  @Transform(({ value }: { value: unknown }) => parseBoolean(value))
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
