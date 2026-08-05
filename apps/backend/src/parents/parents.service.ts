import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FinancialBracket,
  MaritalStatus,
  MembershipStatus,
  NotificationType,
  Parent,
  ParentStatus,
  Prisma,
  StaffRole,
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { ListParentsDto } from './dto/list-parents.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { checkOptimisticLock } from '../common/utils/optimistic-lock';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { I18nService } from '../i18n/i18n.service';

type ParentAuditSnapshot = Omit<Parent, 'createdAt' | 'updatedAt'> & {
  createdAt?: Date;
  updatedAt?: Date;
};

type AuditScalar = string | number | boolean | null;

@Injectable()
export class ParentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly i18n: I18nService,
  ) {}

  async create(staffId: string, dto: CreateParentDto) {
    await this.ensureAssignedStaffExists(dto.assignedStaffId);

    const latest = await this.prisma.parent.findFirst({
      where: { idTag: { startsWith: 'FKP-' } },
      orderBy: { idTag: 'desc' },
    });
    let nextNum = 1;
    if (latest && latest.idTag) {
      const match = latest.idTag.match(/FKP-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    const idTag = `FKP-${String(nextNum).padStart(4, '0')}`;

    const parent = await this.prisma.$transaction(async (tx) => {
      const p = await tx.parent.create({
        data: {
          ...dto,
          idTag,
          dateOfBirth: new Date(dto.dateOfBirth),
          status: dto.status ?? ParentStatus.ACTIVE,
        },
        include: {
          assignedStaff: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          staffId,
          action: 'CREATE',
          entity: 'Parent',
          entityId: p.id,
          changes: this.diffParent(null, p),
        },
      });

      return p;
    });

    await this.notifications.notifyStaffAndAdmins([parent.assignedStaffId], {
      notificationKey: 'notification.parentRegistered',
      params: { parentName: parent.fullName, idTag: parent.idTag, staffName: parent.assignedStaff.fullName },
      type: NotificationType.GENERAL,
      entityType: 'Parent',
      entityId: parent.id,
    });

    const suggestedServices = await this.getSuggestedServices(
      parent.financialBracket,
      parent.maritalStatus,
    );

    return {
      parent,
      suggestedServices,
    };
  }

  async findAll(user: JwtPayload, query: ListParentsDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ParentWhereInput = {
      deletedAt: null,
      ...(user.role !== StaffRole.SUPER_ADMIN ? { assignedStaffId: user.staffId } : {}),
      ...(query.search
        ? {
            OR: [
              {
                fullName: {
                  contains: query.search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                nationalId: {
                  contains: query.search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                phone: {
                  contains: query.search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                idTag: {
                  contains: query.search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.financialBracket
        ? { financialBracket: query.financialBracket }
        : {}),
      ...(query.membershipStatus
        ? { membershipStatus: query.membershipStatus }
        : {}),
      ...(query.assignedStaffId
        ? { assignedStaffId: query.assignedStaffId }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.parent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          idTag: true,
          fullName: true,
          photoUrl: true,
          nationalId: true,
          phone: true,
          email: true,
          city: true,
          subcity: true,
          status: true,
          membershipFee: true,
          membershipStatus: true,
          financialBracket: true,
          maritalStatus: true,
          assignedStaffId: true,
          createdAt: true,
          updatedAt: true,
          assignedStaff: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
          _count: {
            select: {
              children: true,
              fundAllocations: true,
            },
          },
        },
      }),
      this.prisma.parent.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(user: JwtPayload, id: string) {
    const parent = await this.prisma.parent.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(user.role !== StaffRole.SUPER_ADMIN ? { assignedStaffId: user.staffId } : {}),
      },
      include: {
        assignedStaff: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        children: {
          select: {
            child: {
              select: {
                id: true,
                fullName: true,
                photoUrl: true,
                dateOfBirth: true,
                gender: true,
                disabilityType: true,
                disabilityCategory: true,
                severityLevel: true,
                status: true,
              },
            },
          },
          orderBy: { child: { fullName: 'asc' } },
        },
        serviceAssignments: {
          include: {
            service: true,
            assignedStaff: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        fundAllocations: {
          orderBy: { allocationDate: 'desc' },
        },
        referrals: {
          include: {
            staff: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
          orderBy: { referralDate: 'desc' },
        },
        documents: {
          where: { deletedAt: null },
          include: {
            uploadedBy: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        appointments: {
          where: { deletedAt: null },
          include: {
            staff: {
              select: {
                id: true,
                fullName: true,
              },
            },
            parent: {
              select: {
                id: true,
                fullName: true,
              },
            },
            child: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
          orderBy: { scheduledAt: 'desc' },
        },
      },
    });

    if (!parent) {
      throw new NotFoundException('error.parent.notFound');
    }

    return parent;
  }

  async update(staffId: string, id: string, dto: UpdateParentDto) {
    const existing = await this.findParentForAudit(id);

    checkOptimisticLock(existing.updatedAt, dto.expectedUpdatedAt, 'Parent');

    if (dto.assignedStaffId) {
      await this.ensureAssignedStaffExists(dto.assignedStaffId);
    }

    if (dto.nationalId && dto.nationalId !== existing.nationalId) {
      const duplicate = await this.prisma.parent.findUnique({
        where: { nationalId: dto.nationalId },
        select: { id: true },
      });

      if (duplicate) {
        throw new BadRequestException(
          `A parent with national ID "${dto.nationalId}" already exists.`,
        );
      }
    }

    const data = this.compactUndefined({
      ...dto,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
    });

    const parent = await this.prisma.$transaction(async (tx) => {
      const p = await tx.parent.update({
        where: { id },
        data,
        include: {
          assignedStaff: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          staffId,
          action: 'UPDATE',
          entity: 'Parent',
          entityId: p.id,
          changes: this.diffParent(existing, p),
        },
      });

      return p;
    });

    await this.notifications.notifyStaffAndAdmins([parent.assignedStaffId], {
      ...this.parentUpdateMessage(existing, parent),
      type: NotificationType.GENERAL,
      entityType: 'Parent',
      entityId: parent.id,
    });

    return parent;
  }

  async remove(staffId: string, id: string) {
    const existing = await this.findParentForAudit(id);

    const parent = await this.prisma.$transaction(async (tx) => {
      const p = await tx.parent.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          status: 'INACTIVE' as ParentStatus,
        },
      });

      await tx.auditLog.create({
        data: {
          staffId,
          action: 'DELETE',
          entity: 'Parent',
          entityId: p.id,
          changes: this.diffParent(existing, p),
        },
      });

      return p;
    });

    await this.notifications.notifyStaffAndAdmins([parent.assignedStaffId], {
      notificationKey: 'notification.parentStatusChanged',
      params: { parentName: existing.fullName, status: 'INACTIVE' },
      type: NotificationType.GENERAL,
      entityType: 'Parent',
      entityId: parent.id,
    });

    return parent;
  }

  /**
   * Permanently removes a parent and everything that belongs only to them.
   *
   * FundAllocation has a RESTRICT foreign key, so those rows have to go first
   * or the delete is refused outright. The rest of the dependants would be
   * left behind with a null parentId — invisible orphans — so records that
   * exist solely for this parent are removed too. Rows shared with a child
   * (an appointment for both, a referral naming the child) are kept and the
   * database nulls their parentId.
   *
   * There is no undo: unlike remove(), nothing is left to restore from.
   */
  async purge(staffId: string, id: string) {
    const existing = await this.findParentForAudit(id);

    const removed = await this.prisma.$transaction(async (tx) => {
      const [
        fundAllocations,
        attendanceRecords,
        documents,
        serviceAssignments,
        appointments,
        referrals,
      ] = await Promise.all([
        tx.fundAllocation.deleteMany({ where: { parentId: id } }),
        tx.attendanceRecord.deleteMany({ where: { parentId: id } }),
        tx.document.deleteMany({ where: { parentId: id } }),
        tx.serviceAssignment.deleteMany({ where: { parentId: id } }),
        tx.appointment.deleteMany({ where: { parentId: id, childId: null } }),
        tx.referral.deleteMany({ where: { parentId: id, childId: null } }),
      ]);

      // Cascades ChildParent links; nulls the parentId still held by shared
      // appointments, referrals and volunteer services.
      await tx.parent.delete({ where: { id } });

      const counts = {
        fundAllocations: fundAllocations.count,
        attendanceRecords: attendanceRecords.count,
        documents: documents.count,
        serviceAssignments: serviceAssignments.count,
        appointments: appointments.count,
        referrals: referrals.count,
      };

      await tx.auditLog.create({
        data: {
          staffId,
          action: 'PERMANENT_DELETE',
          entity: 'Parent',
          entityId: id,
          changes: {
            before: JSON.parse(JSON.stringify(existing)),
            after: null,
            deletedRelatedRecords: counts,
          },
        },
      });

      return counts;
    });

    return { success: true, deletedRelatedRecords: removed };
  }

  private parentUpdateMessage(existing: ParentAuditSnapshot, parent: Parent) {
    if (existing.assignedStaffId !== parent.assignedStaffId)
      return { notificationKey: 'notification.parentReassigned', params: { parentName: parent.fullName, idTag: parent.idTag } };
    if (existing.status !== parent.status)
      return { notificationKey: 'notification.parentStatusChangedTo', params: { parentName: parent.fullName, idTag: parent.idTag, status: parent.status } };
    return { notificationKey: 'notification.parentProfileUpdated', params: { parentName: parent.fullName, idTag: parent.idTag } };
  }

  private async ensureAssignedStaffExists(assignedStaffId: string) {
    const staff = await this.prisma.staff.findFirst({
      where: {
        id: assignedStaffId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!staff) {
      throw new BadRequestException('error.parent.invalidStaff');
    }
  }

  private async findParentForAudit(id: string) {
    const parent = await this.prisma.parent.findUnique({
      where: { id },
    });

    if (!parent) {
      throw new NotFoundException('error.parent.notFound');
    }

    return parent;
  }

  private async getSuggestedServices(
    financialBracket: FinancialBracket,
    maritalStatus: MaritalStatus,
  ) {
    const names = new Set<string>();

    if (financialBracket === FinancialBracket.LOW) {
      names.add('Financial Aid');
      names.add('Awareness Workshop');
    }

    if (financialBracket === FinancialBracket.MEDIUM) {
      names.add('Awareness Workshop');
    }

    if (
      maritalStatus === MaritalStatus.WIDOWED ||
      maritalStatus === MaritalStatus.DIVORCED
    ) {
      names.add('Psychosocial Counseling');
    }

    if (!names.size) {
      return [];
    }

    return this.prisma.service.findMany({
      where: {
        name: { in: [...names] },
        targetType: 'PARENT',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        targetType: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  private diffParent(
    before: ParentAuditSnapshot | null,
    after: ParentAuditSnapshot,
  ) {
    const changes: Record<string, Prisma.InputJsonValue> = {};
    const fields: Array<keyof ParentAuditSnapshot> = [
      'fullName',
      'photoUrl',
      'dateOfBirth',
      'gender',
      'nationalId',
      'phone',
      'email',
      'address',
      'city',
      'subcity',
      'woreda',
      'maritalStatus',
      'employmentStatus',
      'financialBracket',
      'educationLevel',
      'numberOfDependents',
      'referralSource',
      'status',
      'membershipFee',
      'membershipStatus',
      'internalNotes',
      'assignedStaffId',
    ];

    for (const field of fields) {
      const beforeValue = before ? this.normalizeAuditValue(before[field]) : null;
      const afterValue = this.normalizeAuditValue(after[field]);

      if (beforeValue !== afterValue) {
        changes[field] = {
          before: beforeValue,
          after: afterValue,
        };
      }
    }

    return changes as Prisma.InputJsonObject;
  }

  private normalizeAuditValue(value: unknown): AuditScalar {
    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'string' || typeof value === 'number') {
      return value;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    return null;
  }

  private compactUndefined<T extends Record<string, unknown>>(value: T) {
    return Object.fromEntries(
      Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
    ) as T;
  }

}
