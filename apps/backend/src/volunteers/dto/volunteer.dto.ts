import { Transform, Type } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsDateString, IsBoolean } from 'class-validator';

export class CreateVolunteerDto {
  @IsBoolean()
  @IsOptional()
  isOrganization?: boolean;

  @IsString()
  @IsOptional()
  organizationName?: string;

  @IsString()
  @IsOptional()
  organizationLocation?: string;

  @IsString()
  @IsOptional()
  organizationPhone?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEmail()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  serviceTypes?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateVolunteerDto {
  @IsBoolean()
  @IsOptional()
  isOrganization?: boolean;

  @IsString()
  @IsOptional()
  organizationName?: string;

  @IsString()
  @IsOptional()
  organizationLocation?: string;

  @IsString()
  @IsOptional()
  organizationPhone?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEmail()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  serviceTypes?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsOptional()
  @IsDateString()
  expectedUpdatedAt?: string;
}

export class ListVolunteersDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  isOrganization?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

export class CreateVolunteerServiceDto {
  @IsString()
  @IsNotEmpty()
  serviceType!: string;

  @IsString()
  @IsOptional()
  childId?: string;

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  serviceDate!: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
