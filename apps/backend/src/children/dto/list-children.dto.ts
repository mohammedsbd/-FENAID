import { ChildStatus, DisabilityType, SeverityLevel } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ListChildrenDto {
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
  @IsEnum(DisabilityType)
  disabilityType?: DisabilityType;

  @IsOptional()
  @IsEnum(SeverityLevel)
  severityLevel?: SeverityLevel;

  @IsOptional()
  @IsEnum(ChildStatus)
  status?: ChildStatus;

  @IsOptional()
  @IsString()
  assignedStaffId?: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}
