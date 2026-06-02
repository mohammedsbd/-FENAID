import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsString()
  @IsUrl()
  @IsNotEmpty()
  fileUrl!: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  childId?: string;
}
