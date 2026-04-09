import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class FrequentCustomersQueryDto {
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
