import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Child,
  ChildStatus,
  DisabilityType,
  NotificationType,
  Prisma,
  SeverityLevel,
  StaffRole,
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChildDto } from './dto/create-child.dto';
import { ListChildrenDto } from './dto/list-children.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { checkOptimisticLock } from '../common/utils/optimistic-lock';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { I18nService } from '../i18n/i18n.service';

type ChildAuditSnapshot = Omit<Child, 'createdAt' | 'updatedAt'> & {
  createdAt?: Date;
  updatedAt?: Date;
};

type AuditScalar = string | number | boolean | null;

@Injectable()
export class ChildrenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly i18n: I18nService,
  ) {}

  async create(staffId: string, dto: CreateChildDto) {
    await this.ensureParentsExist(dto.parentIds);
    await this.ensureAssignedStaffExists(dto.assignedStaffId);

    const latest = await this.prisma.child.findFirst({
      where: { idTag: { startsWith: 'FKC-' } },
      orderBy: { idTag: 'desc' },
    });
    let nextNum = 1;
    if (latest && latest.idTag) {
      const match = latest.idTag.match(/FKC-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    const idTag = `FKC-${String(nextNum).padStart(4, '0')}`;

    const { parentIds, ...childData } = dto;

    const child = await this.prisma.$transaction(async (tx) => {
      const c = await tx.child.create({
        data: {
          ...childData,
          idTag,
          dateOfBirth: new Date(dto.dateOfBirth),
          status: dto.status ?? ChildStatus.ACTIVE,
          parents: {
            create: parentIds.map((pid) => ({ parentId: pid })),
          },
        },
        include: {
          parents: {
            include: {
              parent: {
                select: {
                  id: true,
                  fullName: true,
                  photoUrl: true,
                  nationalId: true,
                  phone: true,
                  financialBracket: true,
                  status: true,
                },
              },
            },
          },
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
          entity: 'Child',
          entityId: c.id,
          changes: this.diffChild(null, c),
        },
      });

      return c;
    });

    await this.notifications.notifyStaffAndAdmins([child.assignedStaffId], {
      notificationKey: 'notification.childRegistered',
      params: { childName: child.fullName, idTag: child.idTag, staffName: child.assignedStaff.fullName },
      type: NotificationType.GENERAL,
      entityType: 'Child',
      entityId: child.id,
    });

    const eligibility = await this.getSuggestedServices(
      child.disabilityType,
      child.severityLevel,
    );

    return {
      child,
      suggestedServices: eligibility.suggestedServices,
      eligibilityNotes: eligibility.notes,
    };
  }

  async findAll(user: JwtPayload, query: ListChildrenDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ChildWhereInput = {
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
                idTag: {
                  contains: query.search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            ],
          }
        : {}),
      ...(query.disabilityType ? { disabilityType: query.disabilityType } : {}),
      ...(query.severityLevel ? { severityLevel: query.severityLevel } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.assignedStaffId
        ? { assignedStaffId: query.assignedStaffId }
        : {}),
      ...(query.parentId
        ? { parents: { some: { parentId: query.parentId } } }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.child.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          idTag: true,
          fullName: true,
          photoUrl: true,
          dateOfBirth: true,
          gender: true,
          disabilityType: true,
          disabilityCategory: true,
          severityLevel: true,
          schoolEnrollmentStatus: true,
          communicationAbility: true,
          status: true,
          assignedStaffId: true,
          createdAt: true,
          updatedAt: true,
          parents: {
            select: {
              parent: {
                select: {
                  id: true,
                  fullName: true,
                  photoUrl: true,
                  nationalId: true,
                  phone: true,
                },
              },
            },
          },
          assignedStaff: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.child.count({ where }),
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
    const child = await this.prisma.child.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(user.role !== StaffRole.SUPER_ADMIN ? { assignedStaffId: user.staffId } : {}),
      },
      include: {
        parents: {
          include: {
            parent: {
              include: {
                assignedStaff: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    role: true,
                  },
                },
                fundAllocations: {
                  orderBy: { allocationDate: 'desc' },
                },
              },
            },
          },
        },
        assignedStaff: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
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
        progressNotes: {
          include: {
            staff: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        milestones: {
          orderBy: { createdAt: 'desc' },
        },
        goals: {
          include: {
            staff: {
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
          where: {
            scheduledAt: {
              gte: new Date(),
            },
          },
          include: {
            staff: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
              },
            },
            attendanceRecords: true,
          },
          orderBy: { scheduledAt: 'asc' },
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
      },
    });

    if (!child) {
      throw new NotFoundException('error.child.notFound');
    }

    return child;
  }

  async update(staffId: string, id: string, dto: UpdateChildDto) {
    const existing = await this.findChildForAudit(id);

    checkOptimisticLock(existing.updatedAt, dto.expectedUpdatedAt, 'Child');

    if (dto.parentIds) {
      await this.ensureParentsExist(dto.parentIds);
    }

    if (dto.assignedStaffId) {
      await this.ensureAssignedStaffExists(dto.assignedStaffId);
    }

    const { parentIds, ...scalarData } = dto;

    const data = this.compactUndefined({
      ...scalarData,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
    });

    const child = await this.prisma.$transaction(async (tx) => {
      if (parentIds) {
        await tx.childParent.deleteMany({ where: { childId: id } });
        await tx.childParent.createMany({
          data: parentIds.map((pid) => ({ childId: id, parentId: pid })),
        });
      }

      const c = await tx.child.update({
        where: { id },
        data,
        include: {
          parents: {
            select: {
              parent: {
                select: {
                  id: true,
                  fullName: true,
                  photoUrl: true,
                  nationalId: true,
                  phone: true,
                },
              },
            },
          },
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
          entity: 'Child',
          entityId: c.id,
          changes: this.diffChild(existing, c),
        },
      });

      return c;
    });

    await this.notifications.notifyStaffAndAdmins([child.assignedStaffId], {
      ...this.childUpdateMessage(existing, child),
      type: NotificationType.GENERAL,
      entityType: 'Child',
      entityId: child.id,
    });

    return child;
  }

  async remove(staffId: string, id: string) {
    const existing = await this.findChildForAudit(id);

    const child = await this.prisma.$transaction(async (tx) => {
      const c = await tx.child.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          status: 'INACTIVE' as ChildStatus,
        },
      });

      await tx.auditLog.create({
        data: {
          staffId,
          action: 'DELETE',
          entity: 'Child',
          entityId: c.id,
          changes: this.diffChild(existing, c),
        },
      });

      return c;
    });

    await this.notifications.notifyStaffAndAdmins([child.assignedStaffId], {
      notificationKey: 'notification.childStatusChanged',
      params: { childName: existing.fullName, status: 'INACTIVE' },
      type: NotificationType.GENERAL,
      entityType: 'Child',
      entityId: child.id,
    });

    return child;
  }

  private childUpdateMessage(existing: ChildAuditSnapshot, child: Child) {
    if (existing.assignedStaffId !== child.assignedStaffId)
      return { notificationKey: 'notification.childReassigned', params: { childName: child.fullName, idTag: child.idTag } };
    if (existing.status !== child.status)
      return { notificationKey: 'notification.childStatusChanged', params: { childName: child.fullName, idTag: child.idTag, status: child.status } };
    if (existing.severityLevel !== child.severityLevel)
      return { notificationKey: 'notification.childSeverityUpdated', params: { childName: child.fullName, idTag: child.idTag, severity: child.severityLevel } };
    return { notificationKey: 'notification.childProfileUpdated', params: { childName: child.fullName, idTag: child.idTag } };
  }

  private async ensureParentsExist(parentIds: string[]) {
    if (parentIds.length < 1 || parentIds.length > 2) {
      throw new BadRequestException('error.child.invalidParentCount');
    }

    const parents = await this.prisma.parent.findMany({
      where: {
        id: { in: parentIds },
        status: { not: 'INACTIVE' },
      },
      select: { id: true },
    });

    const foundIds = new Set(parents.map((p) => p.id));
    for (const pid of parentIds) {
      if (!foundIds.has(pid)) {
        throw new BadRequestException('error.child.invalidParent');
      }
    }
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
      throw new BadRequestException('error.child.invalidStaff');
    }
  }

  private async findChildForAudit(id: string) {
    const child = await this.prisma.child.findUnique({
      where: { id },
    });

    if (!child) {
      throw new NotFoundException('error.child.notFound');
    }

    return child;
  }

  private async getSuggestedServices(
    disabilityType: DisabilityType,
    severityLevel: SeverityLevel,
  ) {
    const names = new Set<string>();

    if (disabilityType === DisabilityType.PHYSICAL) {
      names.add('Physiotherapy');
      names.add('Assistive Device Provision');
    }

    if (disabilityType === DisabilityType.INTELLECTUAL) {
      names.add('Special Education');
      names.add('Behavioral Therapy');
    }

    if (disabilityType === DisabilityType.MULTIPLE) {
      names.add('Physiotherapy');
      names.add('Assistive Device Provision');
      names.add('Special Education');
      names.add('Behavioral Therapy');
      names.add('Speech Therapy');
    }

    const notes =
      severityLevel === SeverityLevel.SEVERE
        ? ['Intensive Therapy recommended due to severe support needs.']
        : [];

    const suggestedServices = await this.prisma.service.findMany({
      where: {
        name: { in: [...names] },
        targetType: 'CHILD',
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

    return {
      suggestedServices,
      notes,
    };
  }

  private SENSITIVE_FIELDS = new Set(['medicalHistory', 'medications', 'internalNotes']);

  private diffChild(before: ChildAuditSnapshot | null, after: ChildAuditSnapshot) {
    const changes: Record<string, Prisma.InputJsonValue> = {};
    const fields: Array<keyof ChildAuditSnapshot> = [
      'fullName',
      'photoUrl',
      'dateOfBirth',
      'gender',
      'disabilityType',
      'disabilityCategory',
      'severityLevel',
      'schoolEnrollmentStatus',
      'communicationAbility',
      'status',
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
