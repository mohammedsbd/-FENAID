import { DonorType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsDecimal,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateDonationDto {
  @IsString()
  @IsNotEmpty()
  donorName!: string;

  @IsOptional()
  @IsString()
  donorContact?: string;

  @IsEnum(DonorType)
  @IsNotEmpty()
  donorType!: DonorType;

  @IsDecimal()
  @IsNotEmpty()
  amount!: string;

  @IsDateString()
  @IsNotEmpty()
  donationDate!: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsBoolean()
  isRestricted?: boolean;

  @IsOptional()
  @IsString()
  restrictedToChildId?: string;

  @IsOptional()
  @IsString()
  restrictedToServiceId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateDonationDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  expectedUpdatedAt?: string;
}

export class ListDonationsDto {
  @IsOptional()
  @IsEnum(DonorType)
  donorType?: DonorType;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isRestricted?: boolean;

  @IsOptional()
  @IsString()
  search?: string;
}
