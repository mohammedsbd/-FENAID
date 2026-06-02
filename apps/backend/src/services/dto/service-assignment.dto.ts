import {
  ServiceAssignmentStatus,
  ServiceDeliveryMethod,
  ServiceFrequency,
  ServiceTargetType,
} from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

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

  @IsString()
  @IsNotEmpty()
  assignedStaffId!: string;

  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

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
  notes?: string;
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
}
