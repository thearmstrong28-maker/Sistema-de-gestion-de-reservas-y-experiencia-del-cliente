import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class FrequentCustomersQueryDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'La fecha no es válida.' })
  date?: Date;

  @IsOptional()
  @IsUUID()
  shiftId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El mínimo de visitas debe ser un número entero.' })
  @Min(1, { message: 'El mínimo de visitas debe ser al menos 1.' })
  minVisits?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero.' })
  @Min(1, { message: 'El límite debe ser al menos 1.' })
  limit?: number;
}
