import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ListCustomersQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;
}
