import { IsEmail, IsString, MinLength } from 'class-validator';

export class PromoteAccountDto {
  @IsString()
  @MinLength(8)
  currentPassword!: string;

  @IsEmail()
  targetEmail!: string;
}
