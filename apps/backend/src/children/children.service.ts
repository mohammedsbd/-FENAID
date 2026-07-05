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
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChildDto } from './dto/create-child.dto';
import { ListChildrenDto } from './dto/list-children.dto';
import { UpdateChildDto } from './dto/update-child.dto';
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
    await this.ensureParentExists(dto.parentId);
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

    const child = await this.prisma.child.create({
      data: {
        ...dto,
        idTag,
        dateOfBirth: new Date(dto.dateOfBirth),
        status: dto.status ?? ChildStatus.ACTIVE,
      },
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

    await this.logAudit({
      staffId,
      action: 'CREATE',
      entityId: child.id,
      changes: this.diffChild(null, child),
    });

    await this.notifications.notifyStaffAndAdmins([child.assignedStaffId], {
      message: this.i18n.t('notification.childRegistered', { childName: child.fullName, idTag: child.idTag, staffName: child.assignedStaff.fullName }),
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

  async findAll(query: ListChildrenDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100000);
    const skip = (page - 1) * limit;

    const where: Prisma.ChildWhereInput = {
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
      ...(query.parentId ? { parentId: query.parentId } : {}),
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
          parentId: true,
          assignedStaffId: true,
          createdAt: true,
          updatedAt: true,
          parent: {
            select: {
              id: true,
              fullName: true,
              photoUrl: true,
              nationalId: true,
              phone: true,
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

  async findOne(id: string) {
    const child = await this.prisma.child.findUnique({
      where: { id },
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

    if (dto.parentId) {
      await this.ensureParentExists(dto.parentId);
    }

    if (dto.assignedStaffId) {
      await this.ensureAssignedStaffExists(dto.assignedStaffId);
    }

    const data = this.compactUndefined({
      ...dto,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
    });

    const child = await this.prisma.child.update({
      where: { id },
      data,
      include: {
        parent: {
          select: {
            id: true,
            fullName: true,
            photoUrl: true,
            nationalId: true,
            phone: true,
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

    await this.logAudit({
      staffId,
      action: 'UPDATE',
      entityId: child.id,
      changes: this.diffChild(existing, child),
    });

    await this.notifications.notifyStaffAndAdmins([child.assignedStaffId], {
      message: this.childUpdateMessage(existing, child),
      type: NotificationType.GENERAL,
      entityType: 'Child',
      entityId: child.id,
    });

    return child;
  }

  async remove(staffId: string, id: string) {
    const existing = await this.findChildForAudit(id);

    const newStatus = existing.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE';

    const child = await this.prisma.child.update({
      where: { id },
      data: {
        status: newStatus as ChildStatus,
      },
    });

    await this.logAudit({
      staffId,
      action: 'UPDATE',
      entityId: child.id,
      changes: this.diffChild(existing, child),
    });

    await this.notifications.notifyStaffAndAdmins([child.assignedStaffId], {
      message: this.i18n.t('notification.childStatusChanged', { childName: existing.fullName, status: newStatus }),
      type: NotificationType.GENERAL,
      entityType: 'Child',
      entityId: child.id,
    });

    return child;
  }

  private childUpdateMessage(existing: ChildAuditSnapshot, child: Child) {
    if (existing.assignedStaffId !== child.assignedStaffId) {
      return `Child reassigned: ${child.fullName} (${child.idTag}) has a new assigned staff member.`;
    }

    if (existing.status !== child.status) {
      return `Child status changed: ${child.fullName} (${child.idTag}) is now ${child.status}.`;
    }

    if (existing.severityLevel !== child.severityLevel) {
      return `Child severity updated: ${child.fullName} (${child.idTag}) is now ${child.severityLevel}.`;
    }

    return `Child profile updated: ${child.fullName} (${child.idTag}).`;
  }

  private async ensureParentExists(parentId: string) {
    const parent = await this.prisma.parent.findFirst({
      where: {
        id: parentId,
        status: { not: 'INACTIVE' },
      },
      select: { id: true },
    });

    if (!parent) {
      throw new BadRequestException('error.child.invalidParent');
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
      'medicalHistory',
      'medications',
      'schoolEnrollmentStatus',
      'communicationAbility',
      'status',
      'internalNotes',
      'parentId',
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

  private async logAudit(input: {
    staffId: string;
    action: 'CREATE' | 'UPDATE';
    entityId: string;
    changes: Prisma.InputJsonValue;
  }) {
    await this.prisma.auditLog.create({
      data: {
        staffId: input.staffId,
        action: input.action,
        entity: 'Child',
        entityId: input.entityId,
        changes: input.changes,
      },
    });
  }
}
