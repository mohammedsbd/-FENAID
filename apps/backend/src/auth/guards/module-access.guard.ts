import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionModule, StaffRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MODULE_ACCESS_KEY } from '../decorators/module-access.decorator';
import { AuthenticatedRequest } from '../types/authenticated-request.type';

@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const moduleName = this.reflector.getAllAndOverride<PermissionModule>(
      MODULE_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!moduleName) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const role = request.user.role;

    if (role === StaffRole.SUPER_ADMIN) {
      return true;
    }

    const requiredLevel = ['GET', 'HEAD', 'OPTIONS'].includes(request.method)
      ? 'READ_ONLY'
      : 'FULL';

    const permission = await this.prisma.rolePermission.findUnique({
      where: {
        role_module: {
          role,
          module: moduleName,
        },
      },
      select: { accessLevel: true },
    });

    const accessLevel = permission?.accessLevel ?? defaultAccess(role, moduleName);

    if (accessLevel === 'NO_ACCESS') {
      return false;
    }

    if (requiredLevel === 'READ_ONLY') {
      return accessLevel === 'READ_ONLY' || accessLevel === 'FULL';
    }

    return accessLevel === 'FULL';
  }
}

function defaultAccess(role: StaffRole, moduleName: PermissionModule) {
  if (role === StaffRole.SUPER_ADMIN) {
    return 'FULL';
  }

  if (moduleName === PermissionModule.ACCOUNTS || moduleName === PermissionModule.PERMISSIONS || moduleName === PermissionModule.AUDIT_LOGS) {
    return 'NO_ACCESS';
  }

  if (moduleName === PermissionModule.SESSIONS) {
    return 'READ_ONLY';
  }

  return 'FULL';
}
