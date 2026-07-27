import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ServiceTargetType } from '@prisma/client';
import { checkOptimisticLock } from '../common/utils/optimistic-lock';
import { I18nService } from '../i18n/i18n.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateServiceDto,
  ListServicesDto,
  UpdateServiceDto,
} from './dto/service.dto';

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  async create(staffId: string, dto: CreateServiceDto) {
    const service = await this.prisma.$transaction(async (tx) => {
      const s = await tx.service.create({
        data: {
          name: dto.name,
          description: dto.description,
          category: dto.category,
          targetType: dto.targetType,
          isActive: dto.isActive ?? true,
        },
      });

      await tx.auditLog.create({
        data: {
          staffId,
          action: 'CREATE',
          entity: 'Service',
          entityId: s.id,
          changes: { after: JSON.parse(JSON.stringify(s)) },
        },
      });

      return s;
    });

    return service;
  }

  async findAll(query: ListServicesDto) {
    const where: Prisma.ServiceWhereInput = {
      ...(query.targetType && { targetType: query.targetType }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { category: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const services = await this.prisma.service.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    // Get active assignment counts for each service
    const servicesWithCounts = await Promise.all(
      services.map(async (service) => {
        const activeAssignments = await this.prisma.serviceAssignment.count({
          where: {
            serviceId: service.id,
            status: { in: ['PENDING', 'ACTIVE'] },
          },
        });
        return {
          ...service,
          activeAssignmentCount: activeAssignments,
        };
      }),
    );

    return servicesWithCounts;
  }

  async findOne(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
    });

    if (!service) {
      throw new NotFoundException('error.service.notFound');
    }

    return service;
  }

  async update(staffId: string, id: string, dto: UpdateServiceDto) {
    const existing = await this.findOne(id);
    checkOptimisticLock(existing.updatedAt, dto.expectedUpdatedAt, 'Service');

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.service.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          category: dto.category,
          targetType: dto.targetType,
          isActive: dto.isActive,
        },
      });

      await tx.auditLog.create({
        data: {
          staffId,
          action: 'UPDATE',
          entity: 'Service',
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

  async deactivate(staffId: string, id: string) {
    const service = await this.findOne(id);

    // Check if service has any active assignments
    const activeAssignments = await this.prisma.serviceAssignment.count({
      where: {
        serviceId: id,
        status: { in: ['PENDING', 'ACTIVE'] },
      },
    });

    if (activeAssignments > 0) {
      throw new BadRequestException('error.service.activeAssignments');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.service.update({
        where: { id },
        data: { isActive: false },
      });

      await tx.auditLog.create({
        data: {
          staffId,
          action: 'DEACTIVATE',
          entity: 'Service',
          entityId: id,
          changes: {
            before: JSON.parse(JSON.stringify(service)),
            after: JSON.parse(JSON.stringify(u)),
          },
        },
      });

      return u;
    });

    return updated;
  }

}
