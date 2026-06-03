import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  newPassword?: string;

  @IsOptional()
  @IsBoolean()
  forceChangeOnNextLogin?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyUser?: boolean;
}
