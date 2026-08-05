import {
  ServiceAssignmentStatus,
  ServiceDeliveryMethod,
  ServiceFrequency,
  ServiceTargetType,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateBulkServiceAssignmentDto {
  @IsString()
  @IsNotEmpty()
  serviceId!: string;

  @IsEnum(ServiceTargetType)
  @IsNotEmpty()
  targetType!: ServiceTargetType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  parentIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  childIds?: string[];

  @IsOptional()
  @IsString()
  assignedStaffId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsEnum(ServiceFrequency)
  @IsNotEmpty()
  frequency!: ServiceFrequency;

  @IsEnum(ServiceDeliveryMethod)
  @IsNotEmpty()
  deliveryMethod!: ServiceDeliveryMethod;

  @IsOptional()
  @IsEnum(ServiceAssignmentStatus)
  status?: ServiceAssignmentStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateServiceAssignmentDto {
  @IsString()
  @IsNotEmpty()
  serviceId!: string;

  @IsEnum(ServiceTargetType)
  @IsNotEmpty()
  targetType!: ServiceTargetType;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  childId?: string;

  @IsOptional()
  @IsString()
  assignedStaffId?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsEnum(ServiceFrequency)
  @IsNotEmpty()
  frequency!: ServiceFrequency;

  @IsEnum(ServiceDeliveryMethod)
  @IsNotEmpty()
  deliveryMethod!: ServiceDeliveryMethod;

  @IsOptional()
  @IsEnum(ServiceAssignmentStatus)
  status?: ServiceAssignmentStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateServiceAssignmentDto {
  @IsOptional()
  @IsEnum(ServiceAssignmentStatus)
  status?: ServiceAssignmentStatus;

  @IsOptional()
  @IsString()
  assignedStaffId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(ServiceDeliveryMethod)
  deliveryMethod?: ServiceDeliveryMethod;

  @IsOptional()
  @IsEnum(ServiceFrequency)
  frequency?: ServiceFrequency;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  expectedUpdatedAt?: string;
}

export class ListServiceAssignmentsDto {
  @IsOptional()
  @IsEnum(ServiceAssignmentStatus)
  status?: ServiceAssignmentStatus;

  @IsOptional()
  @IsEnum(ServiceTargetType)
  targetType?: ServiceTargetType;

  @IsOptional()
  @IsString()
  assignedStaffId?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  childId?: string;

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
