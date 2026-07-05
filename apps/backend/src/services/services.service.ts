import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ServiceTargetType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateServiceDto,
  ListServicesDto,
  UpdateServiceDto,
} from './dto/service.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(staffId: string, dto: CreateServiceDto) {
    const service = await this.prisma.service.create({
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        targetType: dto.targetType,
        isActive: dto.isActive ?? true,
      },
    });

    await this.logAudit(staffId, 'CREATE', service.id, service);
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

    const updated = await this.prisma.service.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        targetType: dto.targetType,
        isActive: dto.isActive,
      },
    });

    await this.logAudit(staffId, 'UPDATE', id, updated, existing);
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
      throw new BadRequestException(
        'Cannot deactivate a service with active assignments',
      );
    }

    const updated = await this.prisma.service.update({
      where: { id },
      data: { isActive: false },
    });

    await this.logAudit(staffId, 'DEACTIVATE', id, updated, service);
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
        entity: 'Service',
        entityId,
        changes: {
          before: before ? JSON.parse(JSON.stringify(before)) : null,
          after: JSON.parse(JSON.stringify(after)),
        },
      },
    });
  }
}
