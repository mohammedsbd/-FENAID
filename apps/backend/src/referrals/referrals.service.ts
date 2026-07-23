import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from '../i18n/i18n.service';
import {
  CreateReferralDto,
  ListReferralsDto,
  UpdateReferralDto,
} from './dto/referral.dto';

@Injectable()
export class ReferralsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly i18n: I18nService,
  ) {}

  async create(staffId: string, dto: CreateReferralDto) {
    // Validate that at least one of parentId or childId is provided
    if (!dto.parentId && !dto.childId) {
      throw new BadRequestException('error.referral.parentOrChildRequired');
    }

    // Validate that both parentId and childId are not provided simultaneously
    if (dto.parentId && dto.childId) {
      throw new BadRequestException('error.referral.onlyOneTarget');
    }

    // If parentId is provided, verify parent exists
    if (dto.parentId) {
      const parent = await this.prisma.parent.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('error.parent.notFound');
      }
    }

    // If childId is provided, verify child exists
    if (dto.childId) {
      const child = await this.prisma.child.findUnique({
        where: { id: dto.childId },
      });
      if (!child) {
        throw new NotFoundException('error.child.notFound');
      }
    }

    const referral = await this.prisma.referral.create({
      data: {
        parentId: dto.parentId,
        childId: dto.childId,
        referredTo: dto.referredTo,
        referralReason: dto.referralReason,
        referralDate: new Date(dto.referralDate),
        status: dto.status ?? 'PENDING',
        notes: dto.notes,
        outcome: dto.outcome,
        followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : null,
        referredById: staffId,
      },
      include: {
        parent: { select: { id: true, fullName: true, photoUrl: true } },
        child: { select: { id: true, fullName: true, photoUrl: true } },
        staff: { select: { id: true, fullName: true } },
      },
    });

    await this.logAudit(staffId, 'CREATE', referral.id, referral);

    const targetName =
      referral.child?.fullName ?? referral.parent?.fullName ?? 'Unknown';

    await this.notifications.notifyStaffAndAdmins([staffId], {
      message: this.i18n.t('notification.referralMade', {
        targetName,
        organization: referral.referredTo,
      }),
      type: NotificationType.REFERRAL_MADE,
      entityType: 'Referral',
      entityId: referral.id,
    });

    return referral;
  }

  async findAll(query: ListReferralsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ReferralWhereInput = {
      deletedAt: null,
      ...(query.status && { status: query.status }),
      ...(query.parentId && { parentId: query.parentId }),
      ...(query.childId && { childId: query.childId }),
      ...(query.referredById && { referredById: query.referredById }),
      ...(query.search && {
        OR: [
          { referredTo: { contains: query.search, mode: 'insensitive' } },
          { referralReason: { contains: query.search, mode: 'insensitive' } },
          {
            parent: {
              fullName: { contains: query.search, mode: 'insensitive' },
            },
          },
          {
            child: {
              fullName: { contains: query.search, mode: 'insensitive' },
            },
          },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.referral.findMany({
        where,
        skip,
        take: limit,
        include: {
          parent: { select: { id: true, fullName: true, photoUrl: true } },
          child: { select: { id: true, fullName: true, photoUrl: true } },
          staff: { select: { id: true, fullName: true } },
        },
        orderBy: { referralDate: 'desc' },
      }),
      this.prisma.referral.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const referral = await this.prisma.referral.findFirst({
      where: { id, deletedAt: null },
      include: {
        parent: { select: { id: true, fullName: true, photoUrl: true } },
        child: { select: { id: true, fullName: true, photoUrl: true } },
        staff: { select: { id: true, fullName: true } },
      },
    });

    if (!referral) {
      throw new NotFoundException('error.referral.notFound');
    }

    return referral;
  }

  async update(staffId: string, id: string, dto: UpdateReferralDto) {
    const existing = await this.findOne(id);

    const updateData: Prisma.ReferralUpdateInput = {};
    if (dto.referredTo !== undefined) updateData.referredTo = dto.referredTo;
    if (dto.referralReason !== undefined)
      updateData.referralReason = dto.referralReason;
    if (dto.referralDate !== undefined)
      updateData.referralDate = new Date(dto.referralDate);
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.outcome !== undefined) updateData.outcome = dto.outcome;
    if (dto.followUpDate !== undefined)
      updateData.followUpDate = dto.followUpDate
        ? new Date(dto.followUpDate)
        : null;

    const updated = await this.prisma.referral.update({
      where: { id },
      data: updateData,
      include: {
        parent: { select: { id: true, fullName: true, photoUrl: true } },
        child: { select: { id: true, fullName: true, photoUrl: true } },
        staff: { select: { id: true, fullName: true } },
      },
    });

    await this.logAudit(staffId, 'UPDATE', id, updated, existing);
    return updated;
  }

  async remove(staffId: string, id: string) {
    const existing = await this.findOne(id);

    const updated = await this.prisma.referral.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.logAudit(staffId, 'DELETE', id, updated, existing);
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
        entity: 'Referral',
        entityId,
        changes: {
          before: before ? JSON.parse(JSON.stringify(before)) : null,
          after: JSON.parse(JSON.stringify(after)),
        },
      },
    });
  }
}
