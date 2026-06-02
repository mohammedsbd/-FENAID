import {
  ChildStatus,
  CommunicationAbility,
  DisabilityType,
  SchoolEnrollmentStatus,
  SeverityLevel,
} from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateChildDto {
  @IsString()
  @MinLength(1)
  fullName!: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsDateString()
  dateOfBirth!: string;

  @IsString()
  @MinLength(1)
  gender!: string;

  @IsEnum(DisabilityType)
  disabilityType!: DisabilityType;

  @IsString()
  @MinLength(1)
  disabilityCategory!: string;

  @IsEnum(SeverityLevel)
  severityLevel!: SeverityLevel;

  @IsOptional()
  @IsString()
  medicalHistory?: string;

  @IsOptional()
  @IsString()
  medications?: string;

  @IsEnum(SchoolEnrollmentStatus)
  schoolEnrollmentStatus!: SchoolEnrollmentStatus;

  @IsEnum(CommunicationAbility)
  communicationAbility!: CommunicationAbility;

  @IsOptional()
  @IsEnum(ChildStatus)
  status?: ChildStatus;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsString()
  @MinLength(1)
  parentId!: string;

  @IsString()
  @MinLength(1)
  assignedStaffId!: string;
}
