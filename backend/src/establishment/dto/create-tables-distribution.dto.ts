import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { TableCategory } from '../../reservations/enums/table-category.enum';

export class TableDistributionItemDto {
  @Type(() => Number)
  @IsInt({ message: 'El número de mesa debe ser un número entero.' })
  @Min(1, { message: 'El número de mesa debe ser al menos 1.' })
  tableNumber: number;

  @Type(() => Number)
  @IsInt({ message: 'La capacidad debe ser un número entero.' })
  @Min(1, { message: 'La capacidad debe ser al menos 1.' })
  capacity: number;

  @Type(() => Number)
  @IsInt({ message: 'La posición X debe ser un número entero.' })
  posX: number;

  @Type(() => Number)
  @IsInt({ message: 'La posición Y debe ser un número entero.' })
  posY: number;

  @IsOptional()
  @IsEnum(TableCategory, {
    message: 'La categoría seleccionada no es válida.',
  })
  category?: TableCategory;

  @IsOptional()
  @IsString({ message: 'La etiqueta de sector debe ser texto.' })
  @IsNotEmpty({ message: 'La etiqueta de sector no puede estar vacía.' })
  @MaxLength(60, {
    message: 'La etiqueta de sector no puede superar 60 caracteres.',
  })
  layoutLabel?: string;
}

export class CreateTablesDistributionDto {
  @IsArray({ message: 'Debés enviar una lista de mesas.' })
  @ValidateNested({ each: true })
  @Type(() => TableDistributionItemDto)
  tables: TableDistributionItemDto[];
}
