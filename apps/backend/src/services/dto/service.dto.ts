import { ServiceTargetType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsEnum(ServiceTargetType)
  @IsNotEmpty()
  targetType!: ServiceTargetType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(ServiceTargetType)
  targetType?: ServiceTargetType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ListServicesDto {
  @IsOptional()
  @IsEnum(ServiceTargetType)
  targetType?: ServiceTargetType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
