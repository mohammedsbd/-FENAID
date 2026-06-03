import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { PermissionModule, StaffRole } from '@prisma/client';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { ModuleAccess } from '../auth/decorators/module-access.decorator';
import { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { ListAccountsDto } from './dto/list-accounts.dto';
import { PromoteAccountDto } from './dto/promote-account.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { UpdateMyAccountDto } from './dto/update-my-account.dto';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @ModuleAccess(PermissionModule.ACCOUNTS)
  @Roles(StaffRole.SUPER_ADMIN)
  findAll(@Query() query: ListAccountsDto) {
    return this.accountsService.findAll(query);
  }

  @Post()
  @ModuleAccess(PermissionModule.ACCOUNTS)
  @Roles(StaffRole.SUPER_ADMIN)
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateAccountDto,
  ) {
    return this.accountsService.create(request.user.staffId, dto, requestMeta(request));
  }

  @Patch(':id')
  @ModuleAccess(PermissionModule.ACCOUNTS)
  @Roles(StaffRole.SUPER_ADMIN)
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accountsService.update(request.user.staffId, id, dto, requestMeta(request));
  }

  @Patch(':id/status')
  @ModuleAccess(PermissionModule.ACCOUNTS)
  @Roles(StaffRole.SUPER_ADMIN)
  toggleStatus(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.accountsService.toggleStatus(
      request.user.staffId,
      id,
      Boolean(body.isActive),
      requestMeta(request),
    );
  }

  @Post(':id/reset-password')
  @ModuleAccess(PermissionModule.ACCOUNTS)
  @Roles(StaffRole.SUPER_ADMIN)
  resetPassword(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.accountsService.resetPassword(request.user.staffId, id, dto, requestMeta(request));
  }

  @Post('promote')
  @ModuleAccess(PermissionModule.ACCOUNTS)
  @Roles(StaffRole.SUPER_ADMIN)
  promote(
    @Req() request: AuthenticatedRequest,
    @Body() dto: PromoteAccountDto,
  ) {
    return this.accountsService.promoteToSuperAdmin(request.user.staffId, dto, requestMeta(request));
  }

  @Delete(':id')
  @ModuleAccess(PermissionModule.ACCOUNTS)
  @Roles(StaffRole.SUPER_ADMIN)
  delete(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: DeleteAccountDto,
  ) {
    return this.accountsService.remove(request.user.staffId, id, dto, requestMeta(request));
  }

  @Get('permissions')
  @ModuleAccess(PermissionModule.PERMISSIONS)
  @Roles(StaffRole.SUPER_ADMIN)
  permissions() {
    return this.accountsService.getPermissions();
  }

  @Patch('permissions')
  @ModuleAccess(PermissionModule.PERMISSIONS)
  @Roles(StaffRole.SUPER_ADMIN)
  updatePermissions(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdatePermissionsDto,
  ) {
    return this.accountsService.updatePermissions(request.user.staffId, dto, requestMeta(request));
  }

  @Get('sessions')
  @ModuleAccess(PermissionModule.SESSIONS)
  @Roles(StaffRole.SUPER_ADMIN)
  sessions(@Query('staffId') staffId?: string) {
    return this.accountsService.sessions(staffId || undefined);
  }

  @Delete('sessions/:sessionId')
  @ModuleAccess(PermissionModule.SESSIONS)
  @Roles(StaffRole.SUPER_ADMIN)
  terminateSession(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
  ) {
    return this.accountsService.terminateSession(request.user.staffId, sessionId, requestMeta(request));
  }

  @Get('audit-logs')
  @ModuleAccess(PermissionModule.AUDIT_LOGS)
  @Roles(StaffRole.SUPER_ADMIN)
  auditLogs(@Query() query: { page?: string; limit?: string; staffId?: string; action?: string; from?: string; to?: string }) {
    return this.accountsService.getAuditLogs(query);
  }

  @Get('me')
  @ModuleAccess(PermissionModule.MY_ACCOUNT)
  me(@Req() request: AuthenticatedRequest) {
    return this.accountsService.me(request.user.staffId);
  }

  @Patch('me')
  @ModuleAccess(PermissionModule.MY_ACCOUNT)
  meUpdate(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateMyAccountDto,
  ) {
    return this.accountsService.updateMe(request.user.staffId, dto, requestMeta(request));
  }

  @Get('me/activity')
  @ModuleAccess(PermissionModule.MY_ACCOUNT)
  meActivity(@Req() request: AuthenticatedRequest) {
    return this.accountsService.activity(request.user.staffId);
  }

  @Get('me/sessions')
  @ModuleAccess(PermissionModule.MY_ACCOUNT)
  meSessions(@Req() request: AuthenticatedRequest) {
    return this.accountsService.sessions(request.user.staffId);
  }

  @Delete('me/sessions/:sessionId')
  @ModuleAccess(PermissionModule.MY_ACCOUNT)
  meTerminateSession(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
  ) {
    return this.accountsService.terminateMySession(request.user.staffId, sessionId, requestMeta(request));
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
