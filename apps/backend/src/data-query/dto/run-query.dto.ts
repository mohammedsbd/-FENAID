import type { DataQueryFilters } from '@fikir/types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class RunQueryDto {
  @IsIn(['CHILD', 'PARENT', 'PARENT_CHILD_PAIR'])
  dataSubject!: 'CHILD' | 'PARENT' | 'PARENT_CHILD_PAIR';

  @IsObject()
  filters!: DataQueryFilters;

  @IsArray()
  @IsString({ each: true })
  columns!: string[];

  @IsOptional()
  @IsBoolean()
  anonymize?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc';

  @IsOptional()
  @IsIn(['excel', 'pdf', 'anonymized_excel', 'anonymized_pdf'])
  format?: 'excel' | 'pdf' | 'anonymized_excel' | 'anonymized_pdf';
}
