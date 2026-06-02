import { FinancialBracket, ParentStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ListParentsDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ParentStatus)
  status?: ParentStatus;

  @IsOptional()
  @IsEnum(FinancialBracket)
  financialBracket?: FinancialBracket;

  @IsOptional()
  @IsString()
  assignedStaffId?: string;
}
