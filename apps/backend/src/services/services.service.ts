import { Injectable, NotFoundException } from '@nestjs/common';
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
    };

    return this.prisma.service.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
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
