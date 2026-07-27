import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FundAllocationStatus, NotificationType, Prisma, StaffRole } from '@prisma/client';
import { checkOptimisticLock } from '../common/utils/optimistic-lock';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AcknowledgeFundAllocationDto,
  CreateFundAllocationDto,
  ListFundAllocationsDto,
  UpdateFundAllocationDto,
} from './dto/fund-allocation.dto';
import { JwtPayload } from '../auth/types/jwt-payload.type';
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

    const allocation = await this.prisma.$transaction(async (tx) => {
      const a = await tx.fundAllocation.create({
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

      await tx.auditLog.create({
        data: {
          staffId,
          action: 'CREATE',
          entity: 'FundAllocation',
          entityId: a.id,
          changes: { after: JSON.parse(JSON.stringify(a)) },
        },
      });

      return a;
    });

    await this.notifications.notifyStaffAndAdmins([allocation.parent.assignedStaffId], {
      notificationKey: 'notification.fundAllocated',
      params: { amount: allocation.amount, parentName: allocation.parent.fullName, purpose: allocation.purpose },
      type: NotificationType.FUND_REMINDER,
      entityType: 'FundAllocation',
      entityId: allocation.id,
    });

    return allocation;
  }

  async findAll(user: JwtPayload, query: ListFundAllocationsDto) {
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
      ...(user.role !== StaffRole.SUPER_ADMIN
        ? { parent: { assignedStaffId: user.staffId } }
        : {}),
    };

    return this.prisma.fundAllocation.findMany({
      where,
      take: 1000,
      include: {
        parent: { select: { fullName: true, photoUrl: true } },
        allocatedBy: { select: { fullName: true } },
      },
      orderBy: { allocationDate: 'desc' },
    });
  }

  async findByParent(user: JwtPayload, parentId: string) {
    return this.prisma.fundAllocation.findMany({
      where: {
        parentId,
        ...(user.role !== StaffRole.SUPER_ADMIN
          ? { parent: { assignedStaffId: user.staffId } }
          : {}),
      },
      include: {
        allocatedBy: { select: { fullName: true } },
      },
      orderBy: { allocationDate: 'desc' },
    });
  }

  async findOne(user: JwtPayload, id: string) {
    const allocation = await this.prisma.fundAllocation.findFirst({
      where: {
        id,
        ...(user.role !== StaffRole.SUPER_ADMIN
          ? { parent: { assignedStaffId: user.staffId } }
          : {}),
      },
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

  private async findById(id: string) {
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
    const existing = await this.findById(id);
    checkOptimisticLock(existing.updatedAt, dto.expectedUpdatedAt, 'FundAllocation');

    // Business rule: Once a FundAllocation is marked as DISBURSED and parentAcknowledged is true, it cannot be edited or deleted.
    if (existing.status === FundAllocationStatus.DISBURSED && existing.parentAcknowledged) {
      throw new ForbiddenException('error.fund.finalized');
    }

    const data: Prisma.FundAllocationUpdateInput = {
      ...(dto.status && { status: dto.status }),
      ...(dto.receiptUrl && { receiptUrl: dto.receiptUrl }),
      ...(dto.notes && { notes: dto.notes }),
    };

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.fundAllocation.update({
        where: { id },
        data,
        include: {
          parent: { select: { fullName: true, assignedStaffId: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          staffId,
          action: 'UPDATE',
          entity: 'FundAllocation',
          entityId: id,
          changes: {
            before: JSON.parse(JSON.stringify(existing)),
            after: JSON.parse(JSON.stringify(u)),
          },
        },
      });

      return u;
    });

    if (dto.status || dto.receiptUrl) {
      await this.notifications.notifyStaffAndAdmins(
        [updated.parent.assignedStaffId],
        {
          notificationKey: 'notification.fundStatusUpdated',
          params: { parentName: updated.parent.fullName, amount: updated.amount, status: updated.status },
          type: NotificationType.FUND_REMINDER,
          entityType: 'FundAllocation',
          entityId: updated.id,
        },
      );
    }

    return updated;
  }

  async acknowledge(staffId: string, id: string, dto: AcknowledgeFundAllocationDto) {
    const existing = await this.prisma.fundAllocation.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('error.fund.notFound');
    checkOptimisticLock(existing.updatedAt, dto.expectedUpdatedAt, 'FundAllocation');

    if (existing.status === FundAllocationStatus.DISBURSED && existing.parentAcknowledged) {
      throw new ForbiddenException('error.fund.finalized');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.fundAllocation.update({
        where: { id },
        data: {
          parentAcknowledged: dto.acknowledged,
          acknowledgedAt: dto.acknowledged ? new Date() : null,
        },
        include: {
          parent: { select: { fullName: true, assignedStaffId: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          staffId,
          action: 'ACKNOWLEDGE',
          entity: 'FundAllocation',
          entityId: id,
          changes: {
            before: JSON.parse(JSON.stringify(existing)),
            after: JSON.parse(JSON.stringify(u)),
          },
        },
      });

      return u;
    });

    await this.notifications.notifyStaffAndAdmins(
      [updated.parent.assignedStaffId],
      {
        notificationKey: 'notification.fundStatusUpdated',
        params: { parentName: updated.parent.fullName, amount: updated.amount, status: updated.status, acknowledged: updated.parentAcknowledged ? ' and acknowledged' : '' },
        type: NotificationType.FUND_REMINDER,
        entityType: 'FundAllocation',
        entityId: updated.id,
      },
    );

    return updated;
  }

}
