import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { checkOptimisticLock } from '../common/utils/optimistic-lock';
import { I18nService } from '../i18n/i18n.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateVolunteerDto,
  UpdateVolunteerDto,
  CreateVolunteerServiceDto,
  ListVolunteersDto,
} from './dto/volunteer.dto';

// Services are shown with their recipient, which is either a child, a parent,
// or nobody in particular (a general service).
const SERVICE_INCLUDE = {
  child: { select: { id: true, fullName: true } },
  parent: { select: { id: true, fullName: true } },
} satisfies Prisma.VolunteerServiceInclude;

@Injectable()
export class VolunteersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  async create(staffId: string, dto: CreateVolunteerDto) {
    const existing = await this.prisma.volunteer.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BadRequestException('error.volunteer.emailExists');
    }

    const volunteer = await this.prisma.$transaction(async (tx) => {
      const v = await tx.volunteer.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          phone: dto.phone,
          serviceTypes: dto.serviceTypes,
          notes: dto.notes,
          status: 'ACTIVE',
        },
      });

      await tx.auditLog.create({
        data: {
          staffId,
          action: 'CREATE',
          entity: 'Volunteer',
          entityId: v.id,
          changes: { after: JSON.parse(JSON.stringify(v)) },
        },
      });

      return v;
    });

    return volunteer;
  }

  async findAll(query: ListVolunteersDto = {}) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 10, 1), 100);
    const skip = (page - 1) * limit;
    const search = query.search;

    const where: Prisma.VolunteerWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' as const } },
              { lastName: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
              { phone: { contains: search, mode: 'insensitive' as const } },
              { serviceTypes: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.volunteer.findMany({
        where,
        skip,
        take: limit,
        include: {
          services: {
            include: SERVICE_INCLUDE,
            orderBy: {
              serviceDate: 'desc',
            },
          },
        },
        // id breaks ties so rows can't shift between pages.
        orderBy: [
          { firstName: 'asc' },
          { lastName: 'asc' },
          { id: 'asc' },
        ],
      }),
      this.prisma.volunteer.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findOne(id: string) {
    const volunteer = await this.prisma.volunteer.findFirst({
      where: { id, deletedAt: null },
      include: {
        services: {
          include: SERVICE_INCLUDE,
          orderBy: {
            serviceDate: 'desc',
          },
        },
      },
    });

    if (!volunteer) {
      throw new NotFoundException('error.volunteer.notFound');
    }

    return volunteer;
  }

  async update(staffId: string, id: string, dto: UpdateVolunteerDto) {
    const existing = await this.findOne(id);
    checkOptimisticLock(existing.updatedAt, dto.expectedUpdatedAt, 'Volunteer');

    if (dto.email && dto.email !== existing.email) {
      const emailConflict = await this.prisma.volunteer.findUnique({
        where: { email: dto.email },
      });
      if (emailConflict) {
        throw new BadRequestException('error.volunteer.emailConflict');
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.volunteer.update({
        where: { id },
        data: dto,
      });

      await tx.auditLog.create({
        data: {
          staffId,
          action: 'UPDATE',
          entity: 'Volunteer',
          entityId: id,
          changes: {
            before: JSON.parse(JSON.stringify(existing)),
            after: JSON.parse(JSON.stringify(u)),
          },
        },
      });

      return u;
    });

    return updated;
  }

  async remove(staffId: string, id: string) {
    const existing = await this.findOne(id);
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.volunteer.update({
        where: { id },
        data: { deletedAt: new Date(), status: 'INACTIVE' },
      });

      await tx.auditLog.create({
        data: {
          staffId,
          action: 'DELETE',
          entity: 'Volunteer',
          entityId: id,
          changes: {
            before: JSON.parse(JSON.stringify(existing)),
            after: JSON.parse(JSON.stringify(u)),
          },
        },
      });

      return u;
    });

    return { success: true };
  }

  async addService(staffId: string, volunteerId: string, dto: CreateVolunteerServiceDto) {
    await this.findOne(volunteerId);

    // A service is given either to a child or to a parent, never to both.
    if (dto.childId && dto.parentId) {
      throw new BadRequestException('error.volunteer.onlyOneRecipient');
    }

    if (dto.childId) {
      const child = await this.prisma.child.findFirst({
        where: { id: dto.childId, deletedAt: null },
      });
      if (!child) {
        throw new NotFoundException('error.child.notFound');
      }
    }

    if (dto.parentId) {
      const parent = await this.prisma.parent.findFirst({
        where: { id: dto.parentId, deletedAt: null },
      });
      if (!parent) {
        throw new NotFoundException('error.parent.notFound');
      }
    }

    const service = await this.prisma.$transaction(async (tx) => {
      const s = await tx.volunteerService.create({
        data: {
          volunteerId,
          serviceType: dto.serviceType,
          childId: dto.childId || null,
          parentId: dto.parentId || null,
          description: dto.description,
          serviceDate: new Date(dto.serviceDate),
          notes: dto.notes,
        },
        include: SERVICE_INCLUDE,
      });

      await tx.auditLog.create({
        data: {
          staffId,
          action: 'CREATE_VOLUNTEER_SERVICE',
          entity: 'Volunteer',
          entityId: s.id,
          changes: { after: JSON.parse(JSON.stringify(s)) },
        },
      });

      return s;
    });

    return service;
  }

  async removeService(staffId: string, serviceId: string) {
    const existing = await this.prisma.volunteerService.findUnique({
      where: { id: serviceId },
    });
    if (!existing) {
      throw new NotFoundException('error.volunteer.serviceRecordNotFound');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.volunteerService.delete({
        where: { id: serviceId },
      });

      await tx.auditLog.create({
        data: {
          staffId,
          action: 'DELETE_VOLUNTEER_SERVICE',
          entity: 'Volunteer',
          entityId: serviceId,
          changes: {
            before: JSON.parse(JSON.stringify(existing)),
            after: null,
          },
        },
      });
    });

    return { success: true };
  }

}
