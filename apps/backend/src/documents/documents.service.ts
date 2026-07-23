import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, StaffRole } from '@prisma/client';
import { URL } from 'url';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/document.dto';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { I18nService } from '../i18n/i18n.service';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly i18n: I18nService,
  ) {}

  async create(staffId: string, dto: CreateDocumentDto) {
    this.validateFileUrl(dto.fileUrl);

    const document = await this.prisma.document.create({
      data: {
        name: dto.name,
        category: dto.category,
        fileUrl: dto.fileUrl,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        uploadedById: staffId,
        parentId: dto.parentId,
        childId: dto.childId,
      },
      include: {
        parent: { select: { fullName: true, assignedStaffId: true } },
        child: { select: { fullName: true, assignedStaffId: true } },
      },
    });

    await this.logAudit(staffId, 'CREATE', document.id, document);

    const ownerName =
      document.child?.fullName ??
      document.parent?.fullName ??
      'a beneficiary record';

    await this.notifications.notifyStaffAndAdmins(
      [document.child?.assignedStaffId ?? document.parent?.assignedStaffId],
      {
        message: this.i18n.t('notification.documentUploaded', { name: document.name, ownerName }),
        type: NotificationType.GENERAL,
        entityType: 'Document',
        entityId: document.id,
      },
    );

    return document;
  }

  async findByParent(user: JwtPayload, parentId: string) {
    return this.prisma.document.findMany({
      where: {
        deletedAt: null,
        parentId,
        ...(user.role !== StaffRole.SUPER_ADMIN
          ? {
              OR: [
                { parent: { assignedStaffId: user.staffId } },
                { child: { assignedStaffId: user.staffId } },
              ],
            }
          : {}),
      },
      include: { uploadedBy: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByChild(user: JwtPayload, childId: string) {
    return this.prisma.document.findMany({
      where: {
        deletedAt: null,
        childId,
        ...(user.role !== StaffRole.SUPER_ADMIN
          ? {
              OR: [
                { parent: { assignedStaffId: user.staffId } },
                { child: { assignedStaffId: user.staffId } },
              ],
            }
          : {}),
      },
      include: { uploadedBy: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(staffId: string, id: string) {
    const existing = await this.prisma.document.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('error.document.notFound');

    const updated = await this.prisma.document.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.logAudit(staffId, 'DELETE', id, updated, existing);
    return { success: true };
  }

  private validateFileUrl(url: string) {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();

      const blockedPatterns = [
        /^127\./,
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[01])\./,
        /^192\.168\./,
        /^0\./,
        /^169\.254\./,
        /^::1$/,
        /^localhost$/i,
      ];

      if (blockedPatterns.some((p) => p.test(hostname))) {
        throw new BadRequestException('error.document.invalidUrl');
      }
    } catch {
      throw new BadRequestException('error.document.invalidUrl');
    }
  }

  private async logAudit(
    staffId: string,
    action: string,
    entityId: string,
    after: any,
    before?: any,
  ) {
    await this.prisma.auditLog.create({
      data: {
        staffId,
        action,
        entity: 'Document',
        entityId,
        changes: {
          before: before ? JSON.parse(JSON.stringify(before)) : null,
          after: after ? JSON.parse(JSON.stringify(after)) : null,
        },
      },
    });
  }
}
