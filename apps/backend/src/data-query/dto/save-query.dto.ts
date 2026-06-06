import type { DataQueryFilters } from '@fikir/types';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class SaveQueryDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  filters!: DataQueryFilters;

  @IsArray()
  @IsString({ each: true })
  columns!: string[];

  @IsIn(['CHILD', 'PARENT', 'PARENT_CHILD_PAIR'])
  dataSubject!: 'CHILD' | 'PARENT' | 'PARENT_CHILD_PAIR';

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc';

  @IsOptional()
  @IsBoolean()
  isOrgWide?: boolean;
}

export class UpdateSavedQueryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  filters?: DataQueryFilters;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  columns?: string[];

  @IsOptional()
  @IsIn(['CHILD', 'PARENT', 'PARENT_CHILD_PAIR'])
  dataSubject?: 'CHILD' | 'PARENT' | 'PARENT_CHILD_PAIR';

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc';

  @IsOptional()
  @IsBoolean()
  isOrgWide?: boolean;
}

export class RunSavedQueryDto {
  @IsOptional()
  page?: number;

  @IsOptional()
  pageSize?: number;
}
