import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/document.dto';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(staffId: string, dto: CreateDocumentDto) {
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
        message: `Document uploaded: ${document.name} for ${ownerName}.`,
        type: NotificationType.GENERAL,
        entityType: 'Document',
        entityId: document.id,
      },
    );

    return document;
  }

  async findByParent(parentId: string) {
    return this.prisma.document.findMany({
      where: { parentId },
      include: { uploadedBy: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByChild(childId: string) {
    return this.prisma.document.findMany({
      where: { childId },
      include: { uploadedBy: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(staffId: string, id: string) {
    const existing = await this.prisma.document.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Document not found');

    await this.prisma.document.delete({ where: { id } });
    await this.logAudit(staffId, 'DELETE', id, null, existing);
    return { success: true };
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
