import {
  ChildStatus,
  CommunicationAbility,
  DisabilityType,
  SchoolEnrollmentStatus,
  SeverityLevel,
} from '@prisma/client';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class UpdateChildDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  fullName?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  gender?: string;

  @IsOptional()
  @IsEnum(DisabilityType)
  disabilityType?: DisabilityType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  disabilityCategory?: string;

  @IsOptional()
  @IsEnum(SeverityLevel)
  severityLevel?: SeverityLevel;

  @IsOptional()
  @IsString()
  medicalHistory?: string;

  @IsOptional()
  @IsString()
  medications?: string;

  @IsOptional()
  @IsEnum(SchoolEnrollmentStatus)
  schoolEnrollmentStatus?: SchoolEnrollmentStatus;

  @IsOptional()
  @IsEnum(CommunicationAbility)
  communicationAbility?: CommunicationAbility;

  @IsOptional()
  @IsEnum(ChildStatus)
  status?: ChildStatus;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  parentIds?: string[];

  @IsOptional()
  @IsString()
  @MinLength(1)
  assignedStaffId?: string;

  @IsOptional()
  @IsDateString()
  expectedUpdatedAt?: string;
}
