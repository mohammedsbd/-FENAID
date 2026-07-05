import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FundAllocationStatus, NotificationType, Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateFundAllocationDto,
  ListFundAllocationsDto,
  UpdateFundAllocationDto,
} from './dto/fund-allocation.dto';
import { I18nService } from '../i18n/i18n.service';

@Injectable()
export class FundAllocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly i18n: I18nService,
  ) {}

  async create(staffId: string, dto: CreateFundAllocationDto) {
    // Generate unique reference (e.g., FA-YYYYMMDD-XXXX)
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const reference = `FA-${datePart}-${randomPart}`;

    const allocation = await this.prisma.fundAllocation.create({
      data: {
        parentId: dto.parentId,
        allocatedById: staffId,
        amount: new Prisma.Decimal(dto.amount),
        purpose: dto.purpose,
        allocationDate: new Date(dto.allocationDate),
        status: dto.status ?? FundAllocationStatus.ALLOCATED,
        notes: dto.notes ? `${reference} | ${dto.notes}` : reference,
      },
      include: {
        parent: {
          select: { fullName: true, photoUrl: true, assignedStaffId: true },
        },
        allocatedBy: {
          select: { fullName: true },
        },
      },
    });

    await this.logAudit(staffId, 'CREATE', allocation.id, allocation);

    await this.notifications.notifyStaffAndAdmins([allocation.parent.assignedStaffId], {
      message: this.i18n.t('notification.fundAllocated', { amount: allocation.amount, parentName: allocation.parent.fullName, purpose: allocation.purpose }),
      type: NotificationType.FUND_REMINDER,
      entityType: 'FundAllocation',
      entityId: allocation.id,
    });

    return allocation;
  }

  async findAll(query: ListFundAllocationsDto) {
    const where: Prisma.FundAllocationWhereInput = {
      ...(query.status && { status: query.status }),
      ...(query.parentId && { parentId: query.parentId }),
      ...(query.startDate || query.endDate
        ? {
            allocationDate: {
              ...(query.startDate && { gte: new Date(query.startDate) }),
              ...(query.endDate && { lte: new Date(query.endDate) }),
            },
          }
        : {}),
      ...(query.search && {
        OR: [
          { parent: { fullName: { contains: query.search, mode: 'insensitive' } } },
          { purpose: { contains: query.search, mode: 'insensitive' } },
          { notes: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    return this.prisma.fundAllocation.findMany({
      where,
      include: {
        parent: { select: { fullName: true, photoUrl: true } },
        allocatedBy: { select: { fullName: true } },
      },
      orderBy: { allocationDate: 'desc' },
    });
  }

  async findByParent(parentId: string) {
    return this.prisma.fundAllocation.findMany({
      where: { parentId },
      include: {
        allocatedBy: { select: { fullName: true } },
      },
      orderBy: { allocationDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const allocation = await this.prisma.fundAllocation.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            fullName: true,
            photoUrl: true,
            nationalId: true,
            phone: true,
            assignedStaffId: true,
          },
        },
        allocatedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!allocation) {
      throw new NotFoundException('error.fund.notFound');
    }

    return allocation;
  }

  async update(staffId: string, id: string, dto: UpdateFundAllocationDto) {
    const existing = await this.findOne(id);

    // Business rule: Once a FundAllocation is marked as DISBURSED and parentAcknowledged is true, it cannot be edited or deleted.
    if (existing.status === FundAllocationStatus.DISBURSED && existing.parentAcknowledged) {
      throw new ForbiddenException(
        'This record is finalized and cannot be modified.',
      );
    }

    const data: Prisma.FundAllocationUpdateInput = {
      ...(dto.status && { status: dto.status }),
      ...(dto.receiptUrl && { receiptUrl: dto.receiptUrl }),
      ...(dto.notes && { notes: dto.notes }),
      ...(dto.parentAcknowledged !== undefined && {
        parentAcknowledged: dto.parentAcknowledged,
        acknowledgedAt: dto.parentAcknowledged ? new Date() : null,
      }),
    };

    const updated = await this.prisma.fundAllocation.update({
      where: { id },
      data,
      include: {
        parent: { select: { fullName: true, assignedStaffId: true } },
      },
    });

    await this.logAudit(staffId, 'UPDATE', id, updated, existing);

    if (
      dto.status ||
      dto.parentAcknowledged !== undefined ||
      dto.receiptUrl
    ) {
      await this.notifications.notifyStaffAndAdmins(
        [updated.parent.assignedStaffId],
        {
          message: this.i18n.t('notification.fundStatusUpdated', { parentName: updated.parent.fullName, amount: updated.amount, status: updated.status, acknowledged: updated.parentAcknowledged ? ' and acknowledged' : '' }),
          type: NotificationType.FUND_REMINDER,
          entityType: 'FundAllocation',
          entityId: updated.id,
        },
      );
    }

    return updated;
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
        entity: 'FundAllocation',
        entityId,
        changes: {
          before: before ? JSON.parse(JSON.stringify(before)) : null,
          after: JSON.parse(JSON.stringify(after)),
        },
      },
    });
  }
}
