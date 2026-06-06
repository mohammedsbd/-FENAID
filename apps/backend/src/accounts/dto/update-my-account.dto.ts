import { IsOptional, IsString } from 'class-validator';

export class UpdateMyAccountDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}
