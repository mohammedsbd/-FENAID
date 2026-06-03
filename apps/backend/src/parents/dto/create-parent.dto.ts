import {
  EmploymentStatus,
  FinancialBracket,
  MaritalStatus,
  ParentStatus,
} from '@prisma/client';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateParentDto {
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

  @IsString()
  @MinLength(1)
  nationalId!: string;

  @IsString()
  @MinLength(1)
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(1)
  address!: string;

  @IsString()
  @MinLength(1)
  city!: string;

  @IsString()
  @MinLength(1)
  subcity!: string;

  @IsString()
  @MinLength(1)
  woreda!: string;

  @IsEnum(MaritalStatus)
  maritalStatus!: MaritalStatus;

  @IsEnum(EmploymentStatus)
  employmentStatus!: EmploymentStatus;

  @IsEnum(FinancialBracket)
  financialBracket!: FinancialBracket;

  @IsString()
  @MinLength(1)
  educationLevel!: string;

  @IsInt()
  @Min(0)
  numberOfDependents!: number;

  @IsOptional()
  @IsString()
  referralSource?: string;

  @IsOptional()
  @IsEnum(ParentStatus)
  status?: ParentStatus;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsString()
  @MinLength(1)
  assignedStaffId!: string;
}
