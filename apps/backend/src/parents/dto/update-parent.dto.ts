import {
  EmploymentStatus,
  FinancialBracket,
  MaritalStatus,
  MembershipStatus,
  ParentStatus,
} from '@prisma/client';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateParentDto {
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
  @IsString()
  @MinLength(1)
  nationalId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  address?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  city?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  subcity?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  woreda?: string;

  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus;

  @IsOptional()
  @IsEnum(EmploymentStatus)
  employmentStatus?: EmploymentStatus;

  @IsOptional()
  @IsEnum(FinancialBracket)
  financialBracket?: FinancialBracket;

  @IsOptional()
  @IsString()
  @MinLength(1)
  educationLevel?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  numberOfDependents?: number;

  @IsOptional()
  @IsString()
  referralSource?: string;

  @IsOptional()
  @IsEnum(ParentStatus)
  status?: ParentStatus;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  membershipFee?: number;

  @IsOptional()
  @IsEnum(MembershipStatus)
  membershipStatus?: MembershipStatus;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  assignedStaffId?: string;
}
