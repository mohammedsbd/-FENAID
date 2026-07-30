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

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  parentIds!: string[];

  @IsString()
  @MinLength(1)
  assignedStaffId!: string;
}
