import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GlobalSearchDto {
  @IsString()
  @Transform(({ value }) => String(value ?? '').trim())
  q = '';

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 8;
}
