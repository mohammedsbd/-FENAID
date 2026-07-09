import { IsEmail, IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateVolunteerDto {
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsOptional()
  serviceTypes?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateVolunteerDto {
  @IsString()
  @IsOptional()
  fullName?: string;

  @IsEmail()
  @IsOptional()
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
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  serviceDate!: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
