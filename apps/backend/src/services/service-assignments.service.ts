import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, Prisma, ServiceTargetType } from '@prisma/client';
import { checkOptimisticLock } from '../common/utils/optimistic-lock';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateServiceAssignmentDto,
  ListServiceAssignmentsDto,
  UpdateServiceAssignmentDto,
} from './dto/service-assignment.dto';
import { I18nService } from '../i18n/i18n.service';

@Injectable()
export class ServiceAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly i18n: I18nService,
  ) {}

  async create(staffId: string, dto: CreateServiceAssignmentDto) {
    // Validate targetType consistency
    if (dto.targetType === ServiceTargetType.PARENT && !dto.parentId) {
      throw new BadRequestException('error.service.parentIdRequired');
    }
    if (dto.targetType === ServiceTargetType.CHILD && !dto.childId) {
      throw new BadRequestException('error.service.childIdRequired');
    }
    if (dto.targetType === ServiceTargetType.PARENT && dto.childId) {
      throw new BadRequestException('error.service.childIdMustBeNull');
    }
    if (dto.targetType === ServiceTargetType.CHILD && dto.parentId) {
      throw new BadRequestException('error.service.parentIdMustBeNull');
    }

    // Verify service exists and is active
    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
    });

    if (!service) {
      throw new NotFoundException('error.service.notFound');
    }

    if (!service.isActive) {
      throw new BadRequestException('error.service.inactive');
    }

    if (service.targetType !== dto.targetType) {
      throw new BadRequestException(
        this.i18n.t('error.service.targetTypeMismatch', {
          serviceTargetType: service.targetType,
          assignmentTargetType: dto.targetType,
        }),
      );
    }

    // Check for duplicate active assignment
    const targetId = dto.targetType === ServiceTargetType.PARENT ? dto.parentId : dto.childId;
    const existingActive = await this.prisma.serviceAssignment.findFirst({
      where: {
        serviceId: dto.serviceId,
        targetType: dto.targetType,
        parentId: dto.parentId ?? null,
        childId: dto.childId ?? null,
        status: { in: ['PENDING', 'ACTIVE'] },
      },
    });

    if (existingActive) {
      throw new BadRequestException(
        'This service is already assigned to this person with status: ' +
          existingActive.status.toLowerCase(),
      );
    }

    const assignment = await this.prisma.$transaction(async (tx) => {
      const a = await tx.serviceAssignment.create({
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
          parent: { select: { fullName: true, photoUrl: true } },
          child: { select: { fullName: true, photoUrl: true } },
          assignedStaff: { select: { fullName: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          staffId,
          action: 'CREATE',
          entity: 'ServiceAssignment',
          entityId: a.id,
          changes: { after: JSON.parse(JSON.stringify(a)) },
        },
      });

      return a;
    });

    const targetName =
      assignment.child?.fullName ??
      assignment.parent?.fullName ??
      assignment.targetType.toLowerCase();

    await this.notifications.notifyStaffAndAdmins([assignment.assignedStaffId], {
      notificationKey: 'notification.serviceAssigned',
      params: { serviceName: assignment.service.name, targetName },
      type: NotificationType.GENERAL,
      entityType: 'ServiceAssignment',
      entityId: assignment.id,
    });

    return assignment;
  }

  async findAll(query: ListServiceAssignmentsDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ServiceAssignmentWhereInput = {
      ...(query.status && { status: query.status }),
      ...(query.targetType && { targetType: query.targetType }),
      ...(query.assignedStaffId && { assignedStaffId: query.assignedStaffId }),
      ...(query.parentId && { parentId: query.parentId }),
      ...(query.childId && { childId: query.childId }),
      ...(query.search && {
        OR: [
          { parent: { fullName: { contains: query.search, mode: 'insensitive' } } },
          { child: { fullName: { contains: query.search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.serviceAssignment.findMany({
        where,
        skip,
        take: limit,
        include: {
          service: true,
          parent: { select: { fullName: true, id: true, photoUrl: true } },
          child: { select: { fullName: true, id: true, photoUrl: true } },
          assignedStaff: { select: { fullName: true, id: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.serviceAssignment.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
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
        parent: { select: { fullName: true, id: true, photoUrl: true } },
        child: { select: { fullName: true, id: true, photoUrl: true } },
        assignedStaff: { select: { fullName: true, id: true } },
      },
    });

    if (!assignment) {
      throw new NotFoundException('error.service.assignmentNotFound');
    }

    return assignment;
  }

  async update(staffId: string, id: string, dto: UpdateServiceAssignmentDto) {
    const existing = await this.findOne(id);
    checkOptimisticLock(existing.updatedAt, dto.expectedUpdatedAt, 'ServiceAssignment');

    // Auto-set endDate to today if status changes to COMPLETED
    let endDate = dto.endDate ? new Date(dto.endDate) : undefined;
    if (dto.status === 'COMPLETED' && !endDate) {
      endDate = new Date();
    }

    const updateData: Prisma.ServiceAssignmentUpdateInput = {};
    if (dto.status) updateData.status = dto.status;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (endDate !== undefined) updateData.endDate = endDate;
    if (dto.deliveryMethod) updateData.deliveryMethod = dto.deliveryMethod;
    if (dto.frequency) updateData.frequency = dto.frequency;

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.serviceAssignment.update({
        where: { id },
        data: updateData,
        include: {
          service: true,
          parent: { select: { fullName: true, id: true, photoUrl: true } },
          child: { select: { fullName: true, id: true, photoUrl: true } },
          assignedStaff: { select: { fullName: true, id: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          staffId,
          action: 'UPDATE',
          entity: 'ServiceAssignment',
          entityId: id,
          changes: {
            before: JSON.parse(JSON.stringify(existing)),
            after: JSON.parse(JSON.stringify(u)),
          },
        },
      });

      return u;
    });

    await this.notifications.notifyStaffAndAdmins([existing.assignedStaff.id], {
      notificationKey: 'notification.serviceAssignmentUpdated',
      params: { serviceName: existing.service.name, status: updated.status },
      type: NotificationType.GENERAL,
      entityType: 'ServiceAssignment',
      entityId: updated.id,
    });

    return updated;
  }

}
