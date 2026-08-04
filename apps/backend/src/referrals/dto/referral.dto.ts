import { ReferralStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateReferralDto {
  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  childId?: string;

  @IsString()
  @IsNotEmpty()
  referredTo!: string;

  @IsOptional()
  @IsString()
  referralReason?: string;

  @IsDateString()
  @IsNotEmpty()
  referralDate!: string;

  @IsOptional()
  @IsEnum(ReferralStatus)
  status?: ReferralStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  outcome?: string;

  @IsOptional()
  @IsDateString()
  followUpDate?: string;
}

export class UpdateReferralDto {
  @IsOptional()
  @IsString()
  referredTo?: string;

  @IsOptional()
  @IsString()
  referralReason?: string;

  @IsOptional()
  @IsDateString()
  referralDate?: string;

  @IsOptional()
  @IsEnum(ReferralStatus)
  status?: ReferralStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  outcome?: string;

  @IsOptional()
  @IsDateString()
  followUpDate?: string;

  @IsOptional()
  @IsDateString()
  expectedUpdatedAt?: string;
}

export class ListReferralsDto {
  @IsOptional()
  @IsEnum(ReferralStatus)
  status?: ReferralStatus;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  childId?: string;

  @IsOptional()
  @IsString()
  referredById?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;
}
