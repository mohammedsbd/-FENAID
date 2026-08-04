import { FundAllocationStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsDecimal,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateFundAllocationDto {
  @IsString()
  @IsNotEmpty()
  parentId!: string;

  @IsDecimal()
  @IsNotEmpty()
  amount!: string;

  @IsString()
  @IsNotEmpty()
  purpose!: string;

  @IsDateString()
  @IsNotEmpty()
  allocationDate!: string;

  @IsOptional()
  @IsEnum(FundAllocationStatus)
  status?: FundAllocationStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateFundAllocationDto {
  @IsOptional()
  @IsEnum(FundAllocationStatus)
  status?: FundAllocationStatus;

  @IsOptional()
  @IsDecimal()
  amount?: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsDateString()
  allocationDate?: string;

  @IsOptional()
  @IsString()
  receiptUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  expectedUpdatedAt?: string;
}

export class AcknowledgeFundAllocationDto {
  @IsNotEmpty()
  acknowledged!: boolean;

  @IsOptional()
  @IsDateString()
  expectedUpdatedAt?: string;
}

export class ListFundAllocationsDto {
  @IsOptional()
  @IsEnum(FundAllocationStatus)
  status?: FundAllocationStatus;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
