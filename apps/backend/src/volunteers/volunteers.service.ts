import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVolunteerDto, UpdateVolunteerDto, CreateVolunteerServiceDto } from './dto/volunteer.dto';

@Injectable()
export class VolunteersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(staffId: string, dto: CreateVolunteerDto) {
    const existing = await this.prisma.volunteer.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BadRequestException('Email already registered for a volunteer');
    }

    const volunteer = await this.prisma.volunteer.create({
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

    await this.logAudit(staffId, 'CREATE', volunteer.id, volunteer);
    return volunteer;
  }

  async findAll(search?: string) {
    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' as const } },
        { lastName: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search, mode: 'insensitive' as const } },
        { serviceTypes: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    return this.prisma.volunteer.findMany({
      where,
      include: {
        services: {
          include: {
            child: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
          orderBy: {
            serviceDate: 'desc',
          },
        },
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' },
      ],
    });
  }

  async findOne(id: string) {
    const volunteer = await this.prisma.volunteer.findFirst({
      where: { id, deletedAt: null },
      include: {
        services: {
          include: {
            child: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
          orderBy: {
            serviceDate: 'desc',
          },
        },
      },
    });

    if (!volunteer) {
      throw new NotFoundException('Volunteer not found');
    }

    return volunteer;
  }

  async update(staffId: string, id: string, dto: UpdateVolunteerDto) {
    const existing = await this.findOne(id);

    if (dto.email && dto.email !== existing.email) {
      const emailConflict = await this.prisma.volunteer.findUnique({
        where: { email: dto.email },
      });
      if (emailConflict) {
        throw new BadRequestException('Email already registered for another volunteer');
      }
    }

    const updated = await this.prisma.volunteer.update({
      where: { id },
      data: dto,
    });

    await this.logAudit(staffId, 'UPDATE', id, updated, existing);
    return updated;
  }

  async remove(staffId: string, id: string) {
    const existing = await this.findOne(id);
    const updated = await this.prisma.volunteer.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
    });
    await this.logAudit(staffId, 'DELETE', id, updated, existing);
    return { success: true };
  }

  async addService(staffId: string, volunteerId: string, dto: CreateVolunteerServiceDto) {
    await this.findOne(volunteerId);

    if (dto.childId) {
      const child = await this.prisma.child.findUnique({
        where: { id: dto.childId },
      });
      if (!child) {
        throw new NotFoundException('Child not found');
      }
    }

    const service = await this.prisma.volunteerService.create({
      data: {
        volunteerId,
        serviceType: dto.serviceType,
        childId: dto.childId || null,
        description: dto.description,
        serviceDate: new Date(dto.serviceDate),
        notes: dto.notes,
      },
      include: {
        child: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    await this.logAudit(staffId, 'CREATE_VOLUNTEER_SERVICE', service.id, service);
    return service;
  }

  async removeService(staffId: string, serviceId: string) {
    const existing = await this.prisma.volunteerService.findUnique({
      where: { id: serviceId },
    });
    if (!existing) {
      throw new NotFoundException('Volunteer service record not found');
    }

    await this.prisma.volunteerService.delete({
      where: { id: serviceId },
    });

    await this.logAudit(staffId, 'DELETE_VOLUNTEER_SERVICE', serviceId, null, existing);
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
        entity: 'Volunteer',
        entityId,
        changes: {
          before: before ? JSON.parse(JSON.stringify(before)) : null,
          after: after ? JSON.parse(JSON.stringify(after)) : null,
        },
      },
    });
  }
}
