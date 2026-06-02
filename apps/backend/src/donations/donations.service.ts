import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateDonationDto,
  ListDonationsDto,
  UpdateDonationDto,
} from './dto/donation.dto';

@Injectable()
export class DonationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(staffId: string, dto: CreateDonationDto) {
    if (dto.isRestricted) {
      if (!dto.restrictedToChildId && !dto.restrictedToServiceId) {
        throw new BadRequestException(
          'Restricted donations require either a restrictedToChildId or restrictedToServiceId',
        );
      }
    }

    // Auto-generate a unique receiptNumber (format: DON-YYYY-XXXX)
    const year = new Date().getFullYear();
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    const receiptNumber = `DON-${year}-${randomPart}`;

    const donation = await this.prisma.donation.create({
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
    });

    await this.logAudit(staffId, 'CREATE', donation.id, donation);

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
    };

    return this.prisma.donation.findMany({
      where,
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
      throw new NotFoundException('Donation not found');
    }

    return donation;
  }

  async update(staffId: string, id: string, dto: UpdateDonationDto) {
    const existing = await this.findOne(id);

    const updated = await this.prisma.donation.update({
      where: { id },
      data: {
        notes: dto.notes,
      },
    });

    await this.logAudit(staffId, 'UPDATE', id, updated, existing);

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
        entity: 'Donation',
        entityId,
        changes: {
          before: before ? JSON.parse(JSON.stringify(before)) : null,
          after: JSON.parse(JSON.stringify(after)),
        },
      },
    });
  }
}
