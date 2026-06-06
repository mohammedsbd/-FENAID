import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AccessLevel, PermissionModule, Prisma, StaffRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { ListAccountsDto } from './dto/list-accounts.dto';
import { PromoteAccountDto } from './dto/promote-account.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { UpdateMyAccountDto } from './dto/update-my-account.dto';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';

type AuditMeta = { ipAddress?: string; userAgent?: string };

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findAll(query: ListAccountsDto) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(query.limit || 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.StaffWhereInput = {
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
              { email: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
              { phone: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
            ],
          }
        : {}),
      ...(query.role ? { role: query.role } : {}),
      ...(query.status === 'active' ? { isActive: true, deletedAt: null } : {}),
      ...(query.status === 'inactive' ? { isActive: false, deletedAt: null } : {}),
      ...(query.status === 'deleted' ? { deletedAt: { not: null } } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.staff.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          photoUrl: true,
          role: true,
          isActive: true,
          mustChangePassword: true,
          deletedAt: true,
          createdAt: true,
          lastLoginAt: true,
          _count: {
            select: {
              assignedParents: true,
              assignedChildren: true,
              sessions: true,
            },
          },
        },
      }),
      this.prisma.staff.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async create(actorId: string, dto: CreateAccountDto, meta: AuditMeta = {}) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.staff.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('An account with this email already exists');
    }

    const plainPassword = dto.password || generateTempPassword();
    const passwordHash = await bcrypt.hash(plainPassword, 12);

    const staff = await this.prisma.staff.create({
      data: {
        fullName: dto.fullName.trim(),
        email,
        phone: dto.phone?.trim() || null,
        photoUrl: dto.photoUrl?.trim() || null,
        role: dto.role,
        passwordHash,
        mustChangePassword: dto.forceChangeOnNextLogin ?? true,
        notificationPreferences: defaultNotificationPreferences(),
        passwordUpdatedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        staffId: actorId,
        action: 'CREATE_ACCOUNT',
        entity: 'Staff',
        entityId: staff.id,
        changes: { fullName: staff.fullName, email: staff.email, role: staff.role },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });

    if (dto.sendWelcomeEmail) {
      await this.prisma.notification.create({
        data: {
          staffId: staff.id,
          type: 'GENERAL',
          message: `Welcome to Fikir, ${staff.fullName}.`,
        },
      });
    }

    return {
      staff,
      temporaryPassword: dto.password ? undefined : plainPassword,
      welcomeEmailQueued: Boolean(dto.sendWelcomeEmail),
    };
  }

  async update(actorId: string, id: string, dto: UpdateAccountDto, meta: AuditMeta = {}) {
    const existing = await this.mustFindStaff(id);
    if (dto.email && dto.email.toLowerCase() !== existing.email) {
      const duplicate = await this.prisma.staff.findUnique({
        where: { email: dto.email.toLowerCase() },
        select: { id: true },
      });
      if (duplicate) {
        throw new BadRequestException('Another account already uses that email');
      }
    }

    const staff = await this.prisma.staff.update({
      where: { id },
      data: {
        fullName: dto.fullName?.trim(),
        email: dto.email?.toLowerCase(),
        phone: dto.phone?.trim() ?? undefined,
        photoUrl: dto.photoUrl?.trim() ?? undefined,
        role: dto.role,
        isActive: dto.isActive,
        deletedAt: dto.isActive === true ? null : undefined,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        photoUrl: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        deletedAt: true,
        createdAt: true,
      },
    });

    if (dto.isActive === false) {
      await this.revokeSessions(id);
    }

    await this.prisma.auditLog.create({
      data: {
        staffId: actorId,
        action: 'UPDATE_ACCOUNT',
        entity: 'Staff',
        entityId: id,
        changes: this.diff(existing, staff),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });

    return staff;
  }

  async toggleStatus(actorId: string, id: string, isActive: boolean, meta: AuditMeta = {}) {
    return this.update(actorId, id, { isActive }, meta);
  }

  async resetPassword(actorId: string, id: string, dto: ResetPasswordDto, meta: AuditMeta = {}) {
    const staff = await this.mustFindStaff(id);
    const newPassword = dto.newPassword || generateTempPassword();

    await this.ensurePasswordNotReused(staff.id, newPassword, staff.passwordHash);
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.$transaction(async (tx) => {
      await tx.passwordHistory.create({
        data: {
          staffId: staff.id,
          passwordHash: staff.passwordHash,
        },
      });
      await tx.staff.update({
        where: { id: staff.id },
        data: {
          passwordHash,
          passwordUpdatedAt: new Date(),
          mustChangePassword: dto.forceChangeOnNextLogin ?? true,
        },
      });
    });

    await this.prisma.auditLog.create({
      data: {
        staffId: actorId,
        action: 'RESET_PASSWORD',
        entity: 'Staff',
        entityId: staff.id,
        changes: {
          forceChangeOnNextLogin: dto.forceChangeOnNextLogin ?? true,
          notifyUser: dto.notifyUser ?? false,
        },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });

    if (dto.notifyUser) {
      await this.prisma.notification.create({
        data: {
          staffId: staff.id,
          type: 'GENERAL',
          message: 'Your password has been reset.',
        },
      });
    }

    return { temporaryPassword: dto.newPassword ? undefined : newPassword };
  }

  async promoteToSuperAdmin(actorId: string, dto: PromoteAccountDto, meta: AuditMeta = {}) {
    const actor = await this.mustFindStaff(actorId);
    const matches = await bcrypt.compare(dto.currentPassword, actor.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const target = await this.prisma.staff.findUnique({
      where: { email: dto.targetEmail.toLowerCase() },
    });
    if (!target) {
      throw new NotFoundException('Target account not found');
    }

    const updated = await this.prisma.staff.update({
      where: { id: target.id },
      data: { role: StaffRole.SUPER_ADMIN },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        staffId: actorId,
        action: 'PROMOTE_ACCOUNT',
        entity: 'Staff',
        entityId: target.id,
        changes: { targetEmail: target.email, newRole: 'SUPER_ADMIN' },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });

    return updated;
  }

  async remove(actorId: string, id: string, dto: DeleteAccountDto, meta: AuditMeta = {}) {
    const actor = await this.mustFindStaff(actorId);
    const matches = await bcrypt.compare(dto.currentPassword, actor.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (id === actorId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    const target = await this.mustFindStaff(id);
    const assignedParents = await this.prisma.parent.count({ where: { assignedStaffId: id } });
    const assignedChildren = await this.prisma.child.count({ where: { assignedStaffId: id } });

    if ((assignedParents > 0 || assignedChildren > 0) && !dto.reassignToStaffId) {
      throw new BadRequestException('Reassignment is required before deleting this account');
    }

    if (dto.reassignToStaffId) {
      await this.mustFindActiveStaff(dto.reassignToStaffId);
      await this.prisma.parent.updateMany({
        where: { assignedStaffId: id },
        data: { assignedStaffId: dto.reassignToStaffId },
      });
      await this.prisma.child.updateMany({
        where: { assignedStaffId: id },
        data: { assignedStaffId: dto.reassignToStaffId },
      });
    }

    await this.revokeSessions(id);
    const updated = await this.prisma.staff.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        deletedAt: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        staffId: actorId,
        action: 'DELETE_ACCOUNT',
        entity: 'Staff',
        entityId: target.id,
        changes: {
          reassignedToStaffId: dto.reassignToStaffId || null,
        },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });

    return updated;
  }

  async getPermissions() {
    const rows = await this.prisma.rolePermission.findMany({
      orderBy: [{ role: 'asc' }, { module: 'asc' }],
    });

    if (!rows.length) {
      return defaultPermissionMatrix();
    }

    return rows;
  }

  async updatePermissions(actorId: string, dto: UpdatePermissionsDto, meta: AuditMeta = {}) {
    const rows = await this.prisma.$transaction(
      dto.modules.map((row) =>
        this.prisma.rolePermission.upsert({
          where: {
            role_module: { role: dto.role, module: row.module },
          },
          create: {
            role: dto.role,
            module: row.module,
            accessLevel: row.accessLevel,
          },
          update: {
            accessLevel: row.accessLevel,
          },
        }),
      ),
    );

    await this.prisma.auditLog.create({
      data: {
        staffId: actorId,
        action: 'UPDATE_PERMISSIONS',
        entity: 'RolePermission',
        entityId: dto.role,
        changes: { modules: dto.modules },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });

    return rows;
  }

  async listSessions(staffId?: string) {
    return this.prisma.session.findMany({
      where: {
        ...(staffId ? { staffId } : {}),
        revokedAt: null,
      },
      include: {
        staff: {
          select: { id: true, fullName: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async terminateSession(actorId: string, sessionId: string, meta: AuditMeta = {}) {
    const session = await this.prisma.session.findUnique({ where: { tokenId: sessionId } });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await this.prisma.session.update({
      where: { tokenId: sessionId },
      data: { revokedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        staffId: actorId,
        action: 'TERMINATE_SESSION',
        entity: 'Session',
        entityId: session.id,
        changes: { staffId: session.staffId },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });

    return { success: true };
  }

  async getAuditLogs(query: {
    page?: string;
    limit?: string;
    staffId?: string;
    action?: string;
    from?: string;
    to?: string;
  }) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 25)));
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      ...(query.staffId ? { staffId: query.staffId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { staff: { select: { id: true, fullName: true, email: true, role: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async me(staffId: string) {
    return this.prisma.staff.findUnique({
      where: { id: staffId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        photoUrl: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        notificationPreferences: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateMe(staffId: string, dto: UpdateMyAccountDto, meta: AuditMeta = {}) {
    const existing = await this.prisma.staff.findUnique({ where: { id: staffId } });
    if (!existing) {
      throw new NotFoundException('Account not found');
    }

    if (dto.email && dto.email.toLowerCase() !== existing.email) {
      const duplicate = await this.prisma.staff.findUnique({
        where: { email: dto.email.toLowerCase() },
        select: { id: true },
      });
      if (duplicate) {
        throw new BadRequestException('Another account already uses that email');
      }
    }

    const updated = await this.prisma.staff.update({
      where: { id: staffId },
      data: {
        fullName: dto.fullName?.trim(),
        email: dto.email?.toLowerCase(),
        photoUrl: dto.photoUrl?.trim() ?? undefined,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        photoUrl: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        notificationPreferences: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        staffId,
        action: 'UPDATE_MY_ACCOUNT',
        entity: 'Staff',
        entityId: staffId,
        changes: {
          before: {
            fullName: existing.fullName,
            email: existing.email,
            photoUrl: existing.photoUrl,
          },
          after: {
            fullName: updated.fullName,
            email: updated.email,
            photoUrl: updated.photoUrl,
          },
        },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });

    return updated;
  }

  async activity(staffId: string) {
    const from = new Date();
    from.setDate(from.getDate() - 90);
    return this.prisma.auditLog.findMany({
      where: { staffId, createdAt: { gte: from } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async sessions(staffId?: string) {
    return this.listSessions(staffId);
  }

  async terminateMySession(staffId: string, sessionId: string, meta: AuditMeta = {}) {
    const session = await this.prisma.session.findUnique({ where: { tokenId: sessionId } });
    if (!session || session.staffId !== staffId) {
      throw new NotFoundException('Session not found');
    }
    return this.terminateSession(staffId, sessionId, meta);
  }

  private async mustFindStaff(id: string) {
    const staff = await this.prisma.staff.findUnique({ where: { id } });
    if (!staff) {
      throw new NotFoundException('Account not found');
    }
    return staff;
  }

  private async mustFindActiveStaff(id: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { id, isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (!staff) {
      throw new NotFoundException('Reassignment account not found');
    }
    return staff;
  }

  private async revokeSessions(staffId: string) {
    await this.prisma.session.updateMany({
      where: { staffId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async ensurePasswordNotReused(
    staffId: string,
    candidatePassword: string,
    currentPasswordHash: string,
  ) {
    const history = await this.prisma.passwordHistory.findMany({
      where: { staffId },
      orderBy: { createdAt: 'desc' },
      take: 2,
      select: { passwordHash: true },
    });

    for (const passwordHash of [currentPasswordHash, ...history.map((item) => item.passwordHash)]) {
      if (await bcrypt.compare(candidatePassword, passwordHash)) {
        throw new BadRequestException('New password must not match any of the last 3 passwords');
      }
    }
  }

  private diff(before: any, after: any) {
    return {
      before: {
        fullName: before.fullName,
        email: before.email,
        phone: before.phone,
        photoUrl: before.photoUrl,
        role: before.role,
        isActive: before.isActive,
      },
      after: {
        fullName: after.fullName,
        email: after.email,
        phone: after.phone,
        photoUrl: after.photoUrl,
        role: after.role,
        isActive: after.isActive,
      },
    };
  }
}

function generateTempPassword() {
  return `Fikir-${randomUUID().slice(0, 8)}!`;
}

function defaultNotificationPreferences() {
  return {
    email: true,
    sms: false,
    inApp: true,
  };
}

function defaultPermissionMatrix() {
  return [
    { role: StaffRole.CASE_WORKER, module: PermissionModule.PARENTS, accessLevel: AccessLevel.FULL },
    { role: StaffRole.CASE_WORKER, module: PermissionModule.CHILDREN, accessLevel: AccessLevel.FULL },
    { role: StaffRole.CASE_WORKER, module: PermissionModule.SERVICES, accessLevel: AccessLevel.FULL },
    { role: StaffRole.CASE_WORKER, module: PermissionModule.FINANCE, accessLevel: AccessLevel.FULL },
    { role: StaffRole.CASE_WORKER, module: PermissionModule.APPOINTMENTS, accessLevel: AccessLevel.FULL },
    { role: StaffRole.CASE_WORKER, module: PermissionModule.DOCUMENTS, accessLevel: AccessLevel.FULL },
    { role: StaffRole.CASE_WORKER, module: PermissionModule.DASHBOARD, accessLevel: AccessLevel.FULL },
    { role: StaffRole.CASE_WORKER, module: PermissionModule.REPORTS, accessLevel: AccessLevel.READ_ONLY },
    { role: StaffRole.VIEWER, module: PermissionModule.PARENTS, accessLevel: AccessLevel.READ_ONLY },
    { role: StaffRole.VIEWER, module: PermissionModule.CHILDREN, accessLevel: AccessLevel.READ_ONLY },
    { role: StaffRole.VIEWER, module: PermissionModule.SERVICES, accessLevel: AccessLevel.READ_ONLY },
    { role: StaffRole.VIEWER, module: PermissionModule.FINANCE, accessLevel: AccessLevel.READ_ONLY },
    { role: StaffRole.VIEWER, module: PermissionModule.APPOINTMENTS, accessLevel: AccessLevel.READ_ONLY },
    { role: StaffRole.VIEWER, module: PermissionModule.DOCUMENTS, accessLevel: AccessLevel.READ_ONLY },
    { role: StaffRole.VIEWER, module: PermissionModule.DASHBOARD, accessLevel: AccessLevel.READ_ONLY },
    { role: StaffRole.VIEWER, module: PermissionModule.REPORTS, accessLevel: AccessLevel.READ_ONLY },
  ];
}
