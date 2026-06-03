import { IsOptional, IsString, MinLength } from 'class-validator';

export class DeleteAccountDto {
  @IsOptional()
  @IsString()
  reassignToStaffId?: string;

  @IsString()
  @MinLength(8)
  currentPassword!: string;
}
