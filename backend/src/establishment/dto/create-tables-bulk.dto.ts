import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { TableCategory } from '../../reservations/enums/table-category.enum';

export class CreateTablesBulkDto {
  @Type(() => Number)
  @IsInt({ message: 'La cantidad debe ser un número entero.' })
  @Min(1, { message: 'La cantidad debe ser al menos 1.' })
  quantity: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La capacidad debe ser un número entero.' })
  @Min(1, { message: 'La capacidad debe ser al menos 1.' })
  capacity?: number;

  @IsOptional()
  @IsEnum(TableCategory, {
    message: 'La categoría seleccionada no es válida.',
  })
  category?: TableCategory;
}
