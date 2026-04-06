import { IsOptional, IsUUID } from 'class-validator';

export class AssignTableDto {
  @IsOptional()
  @IsUUID()
  tableId?: string;
}
