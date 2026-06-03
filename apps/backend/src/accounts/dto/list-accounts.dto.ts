import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { StaffRole } from '@prisma/client';

export class ListAccountsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(StaffRole)
  role?: StaffRole;

  @IsOptional()
  @IsIn(['active', 'inactive', 'deleted'])
  status?: 'active' | 'inactive' | 'deleted';

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
