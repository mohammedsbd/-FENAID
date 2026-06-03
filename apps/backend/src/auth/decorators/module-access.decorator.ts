import { SetMetadata } from '@nestjs/common';
import { PermissionModule } from '@prisma/client';

export const MODULE_ACCESS_KEY = 'module_access';

export const ModuleAccess = (module: PermissionModule) =>
  SetMetadata(MODULE_ACCESS_KEY, module);
