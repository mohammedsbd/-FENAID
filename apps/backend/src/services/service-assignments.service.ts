import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ServiceTargetType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateServiceAssignmentDto,
  ListServiceAssignmentsDto,
  UpdateServiceAssignmentDto,
} from './dto/service-assignment.dto';

@Injectable()
export class ServiceAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(staffId: string, dto: CreateServiceAssignmentDto) {
    // Validate targetType consistency
    if (dto.targetType === ServiceTargetType.PARENT && !dto.parentId) {
      throw new BadRequestException('parentId is required for targetType PARENT');
    }
    if (dto.targetType === ServiceTargetType.CHILD && !dto.childId) {
      throw new BadRequestException('childId is required for targetType CHILD');
    }

    // Verify service exists and matches targetType
    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (service.targetType !== dto.targetType) {
      throw new BadRequestException(
        `Service targetType (${service.targetType}) does not match assignment targetType (${dto.targetType})`,
      );
    }

    const assignment = await this.prisma.serviceAssignment.create({
      data: {
        serviceId: dto.serviceId,
        targetType: dto.targetType,
        parentId: dto.parentId,
        childId: dto.childId,
        assignedStaffId: dto.assignedStaffId,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        frequency: dto.frequency,
        deliveryMethod: dto.deliveryMethod,
        status: dto.status ?? 'PENDING',
        notes: dto.notes,
      },
      include: {
        service: true,
        parent: { select: { fullName: true } },
        child: { select: { fullName: true } },
        assignedStaff: { select: { fullName: true } },
      },
    });

    await this.logAudit(staffId, 'CREATE', assignment.id, assignment);
    return assignment;
  }

  async findAll(query: ListServiceAssignmentsDto) {
    const where: Prisma.ServiceAssignmentWhereInput = {
      ...(query.status && { status: query.status }),
      ...(query.targetType && { targetType: query.targetType }),
      ...(query.assignedStaffId && { assignedStaffId: query.assignedStaffId }),
      ...(query.parentId && { parentId: query.parentId }),
      ...(query.childId && { childId: query.childId }),
    };

    return this.prisma.serviceAssignment.findMany({
      where,
      include: {
        service: true,
        parent: { select: { fullName: true } },
        child: { select: { fullName: true } },
        assignedStaff: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByParent(parentId: string) {
    return this.prisma.serviceAssignment.findMany({
      where: { parentId },
      include: {
        service: true,
        assignedStaff: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByChild(childId: string) {
    return this.prisma.serviceAssignment.findMany({
      where: { childId },
      include: {
        service: true,
        assignedStaff: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const assignment = await this.prisma.serviceAssignment.findUnique({
      where: { id },
      include: {
        service: true,
        parent: { select: { fullName: true, id: true } },
        child: { select: { fullName: true, id: true } },
        assignedStaff: { select: { fullName: true, id: true } },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Service assignment not found');
    }

    return assignment;
  }

  async update(staffId: string, id: string, dto: UpdateServiceAssignmentDto) {
    const existing = await this.findOne(id);

    const updated = await this.prisma.serviceAssignment.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes,
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
        entity: 'ServiceAssignment',
        entityId,
        changes: {
          before: before ? JSON.parse(JSON.stringify(before)) : null,
          after: JSON.parse(JSON.stringify(after)),
        },
      },
    });
  }
}
