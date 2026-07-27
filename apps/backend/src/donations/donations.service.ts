import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { checkOptimisticLock } from '../common/utils/optimistic-lock';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateDonationDto,
  ListDonationsDto,
  UpdateDonationDto,
} from './dto/donation.dto';
import { I18nService } from '../i18n/i18n.service';

@Injectable()
export class DonationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly i18n: I18nService,
  ) {}

  async create(staffId: string, dto: CreateDonationDto) {
    if (dto.isRestricted) {
      if (!dto.restrictedToChildId && !dto.restrictedToServiceId) {
        throw new BadRequestException('error.donation.restrictedFields');
      }
    }

    // Auto-generate a unique receiptNumber (format: DON-YYYY-XXXX)
    const year = new Date().getFullYear();
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    const receiptNumber = `DON-${year}-${randomPart}`;

    const donation = await this.prisma.$transaction(async (tx) => {
      const d = await tx.donation.create({
        data: {
          donorName: dto.donorName,
          donorContact: dto.donorContact,
          donorType: dto.donorType,
          amount: new Prisma.Decimal(dto.amount),
          donationDate: new Date(dto.donationDate),
          purpose: dto.purpose,
          isRestricted: dto.isRestricted ?? false,
          restrictedToChildId: dto.restrictedToChildId,
          restrictedToServiceId: dto.restrictedToServiceId,
          receivedById: staffId,
          receiptNumber,
          notes: dto.notes,
        },
        include: {
          restrictedToChild: {
            select: { id: true, fullName: true, assignedStaffId: true },
          },
          restrictedToService: {
            select: { id: true, name: true },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          staffId,
          action: 'CREATE',
          entity: 'Donation',
          entityId: d.id,
          changes: { after: JSON.parse(JSON.stringify(d)) },
        },
      });

      return d;
    });

    const restrictedTarget = donation.restrictedToChild
      ? ` for ${donation.restrictedToChild.fullName}`
      : donation.restrictedToService
        ? ` for ${donation.restrictedToService.name}`
        : '';

    await this.notifications.notifyStaffAndAdmins(
      [donation.restrictedToChild?.assignedStaffId],
      {
        notificationKey: 'notification.donationReceived',
        params: { amount: donation.amount, donorName: donation.donorName, target: restrictedTarget || '' },
        type: NotificationType.GENERAL,
        entityType: 'Donation',
        entityId: donation.id,
      },
    );

    return donation;
  }

  async findAll(query: ListDonationsDto) {
    const where: Prisma.DonationWhereInput = {
      ...(query.donorType && { donorType: query.donorType }),
      ...(query.isRestricted !== undefined && { isRestricted: query.isRestricted }),
      ...(query.startDate || query.endDate
        ? {
            donationDate: {
              ...(query.startDate && { gte: new Date(query.startDate) }),
              ...(query.endDate && { lte: new Date(query.endDate) }),
            },
          }
        : {}),
      ...(query.search && {
        OR: [
          { donorName: { contains: query.search, mode: 'insensitive' } },
          { receiptNumber: { contains: query.search, mode: 'insensitive' } },
          { donorContact: { contains: query.search, mode: 'insensitive' } },
          { purpose: { contains: query.search, mode: 'insensitive' } },
          { notes: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    return this.prisma.donation.findMany({
      where,
      take: 1000,
      include: {
        receivedBy: { select: { fullName: true } },
        restrictedToChild: { select: { fullName: true } },
        restrictedToService: { select: { name: true } },
      },
      orderBy: { donationDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const donation = await this.prisma.donation.findUnique({
      where: { id },
      include: {
        receivedBy: { select: { fullName: true, email: true } },
        restrictedToChild: { select: { fullName: true, id: true } },
        restrictedToService: { select: { name: true, id: true } },
      },
    });

    if (!donation) {
      throw new NotFoundException('error.donation.notFound');
    }

    return donation;
  }

  async update(staffId: string, id: string, dto: UpdateDonationDto) {
    const existing = await this.findOne(id);
    checkOptimisticLock(existing.updatedAt, dto.expectedUpdatedAt, 'Donation');

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.donation.update({
        where: { id },
        data: {
          notes: dto.notes,
        },
      });

      await tx.auditLog.create({
        data: {
          staffId,
          action: 'UPDATE',
          entity: 'Donation',
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

  async getSummary() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [thisMonth, thisYear, byDonorType] = await Promise.all([
      this.prisma.donation.aggregate({
        where: { donationDate: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.donation.aggregate({
        where: { donationDate: { gte: startOfYear } },
        _sum: { amount: true },
      }),
      this.prisma.donation.groupBy({
        by: ['donorType'],
        _sum: { amount: true },
      }),
    ]);

    return {
      totalThisMonth: thisMonth._sum.amount || 0,
      totalThisYear: thisYear._sum.amount || 0,
      byDonorType: byDonorType.map((group) => ({
        type: group.donorType,
        total: group._sum.amount || 0,
      })),
    };
  }

}
