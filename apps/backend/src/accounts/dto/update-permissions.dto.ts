import { IsArray, IsEnum } from 'class-validator';
import { AccessLevel, PermissionModule, StaffRole } from '@prisma/client';

export class UpdatePermissionsDto {
  @IsEnum(StaffRole)
  role!: StaffRole;

  @IsArray()
  modules!: Array<{
    module: PermissionModule;
    accessLevel: AccessLevel;
  }>;
}
