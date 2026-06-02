import { IsString, Matches, MinLength } from 'class-validator';

const passwordMessage =
  'newPassword must be at least 8 characters and contain uppercase, lowercase, and number';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: passwordMessage })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: passwordMessage,
  })
  newPassword!: string;

  @IsString()
  @MinLength(1)
  confirmPassword!: string;
}
