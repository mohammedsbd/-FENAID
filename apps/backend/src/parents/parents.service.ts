import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FinancialBracket,
  MaritalStatus,
  Parent,
  ParentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { ListParentsDto } from './dto/list-parents.dto';
import { UpdateParentDto } from './dto/update-parent.dto';

type ParentAuditSnapshot = Omit<Parent, 'createdAt' | 'updatedAt'> & {
  createdAt?: Date;
  updatedAt?: Date;
};

type AuditScalar = string | number | boolean | null;

@Injectable()
export class ParentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(staffId: string, dto: CreateParentDto) {
    await this.ensureAssignedStaffExists(dto.assignedStaffId);

    const parent = await this.prisma.parent.create({
      data: {
        ...dto,
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

    await this.logAudit({
      staffId,
      action: 'CREATE',
      entityId: parent.id,
      changes: this.diffParent(null, parent),
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

  async findAll(query: ListParentsDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ParentWhereInput = {
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
            ],
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.financialBracket
        ? { financialBracket: query.financialBracket }
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
          fullName: true,
          photoUrl: true,
          nationalId: true,
          phone: true,
          email: true,
          city: true,
          subcity: true,
          status: true,
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

  async findOne(id: string) {
    const parent = await this.prisma.parent.findUnique({
      where: { id },
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
          orderBy: { fullName: 'asc' },
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

    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    return parent;
  }

  async update(staffId: string, id: string, dto: UpdateParentDto) {
    const existing = await this.findParentForAudit(id);

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

    const parent = await this.prisma.parent.update({
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

    await this.logAudit({
      staffId,
      action: 'UPDATE',
      entityId: parent.id,
      changes: this.diffParent(existing, parent),
    });

    return parent;
  }

  async remove(staffId: string, id: string) {
    const existing = await this.findParentForAudit(id);

    const parent = await this.prisma.parent.update({
      where: { id },
      data: {
        status: ParentStatus.INACTIVE,
      },
    });

    await this.logAudit({
      staffId,
      action: 'UPDATE',
      entityId: parent.id,
      changes: this.diffParent(existing, parent),
    });

    return parent;
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
      throw new BadRequestException('assignedStaffId must reference active staff');
    }
  }

  private async findParentForAudit(id: string) {
    const parent = await this.prisma.parent.findUnique({
      where: { id },
    });

    if (!parent) {
      throw new NotFoundException('Parent not found');
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
        entity: 'Parent',
        entityId: input.entityId,
        changes: input.changes,
      },
    });
  }
}
