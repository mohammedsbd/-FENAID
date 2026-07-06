import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { PermissionModule, StaffRole } from '@prisma/client';
import type { Request } from 'express';
import { ModuleAccess } from '../auth/decorators/module-access.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import { UpdateSystemSettingsDto } from './dto/update-system-settings.dto';
import { SettingsService } from './settings.service';

@Controller('settings')
@ModuleAccess(PermissionModule.MY_ACCOUNT)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('system')
  @Roles(StaffRole.SUPER_ADMIN)
  getSystemSettings() {
    return this.settingsService.getSystemSettings();
  }

  @Patch('system')
  @Roles(StaffRole.SUPER_ADMIN)
  updateSystemSettings(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateSystemSettingsDto,
  ) {
    return this.settingsService.updateSystemSettings(
      request.user.staffId,
      dto,
      requestMeta(request),
    );
  }
}

function requestMeta(request: Request) {
  return {
    ipAddress: request.ip,
    userAgent: Array.isArray(request.headers['user-agent'])
      ? request.headers['user-agent'][0]
      : request.headers['user-agent'],
  };
}
