import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  ChildStatus,
  FundAllocationStatus,
  NotificationType,
  StaffRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findMyUnread(staffId: string) {
    return this.prisma.notification.findMany({
      where: { staffId, isRead: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(staffId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, staffId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(staffId: string) {
    return this.prisma.notification.updateMany({
      where: { staffId, isRead: false },
      data: { isRead: true },
    });
  }

  async createNotification(data: {
    staffId: string;
    message: string;
    type: NotificationType;
    entityType?: string;
    entityId?: string;
  }) {
    return this.prisma.notification.create({
      data: {
        staffId: data.staffId,
        message: data.message,
        type: data.type,
        entityType: data.entityType,
        entityId: data.entityId,
      },
    });
  }

  // --- Scheduled Jobs ---

  // Daily at 8:00 AM
  @Cron('0 8 * * *')
  async runDailyJobs() {
    this.logger.log('Running daily notification jobs...');
    await Promise.all([
      this.checkOverdueProgressNotes(),
      this.checkExpiringServiceAssignments(),
      this.checkExpiringDocuments(),
      this.checkStagnantFundAllocations(),
    ]);
  }

  // Weekly Summary: Every Monday at 8:00 AM
  @Cron('0 8 * * 1')
  async runWeeklySummary() {
    this.logger.log('Running weekly summary job...');
    await this.notifyWeeklyDonationSummary();
  }

  // 1. Children with no progress note in 30 days
  private async checkOverdueProgressNotes() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const children = await this.prisma.child.findMany({
      where: {
        status: ChildStatus.ACTIVE,
        progressNotes: {
          none: {
            createdAt: { gte: thirtyDaysAgo },
          },
        },
      },
      select: { id: true, fullName: true, assignedStaffId: true },
    });

    for (const child of children) {
      await this.createNotification({
        staffId: child.assignedStaffId,
        message: `Overdue Progress Note: ${child.fullName} hasn't had a progress note in over 30 days.`,
        type: NotificationType.PROGRESS_OVERDUE,
        entityType: 'Child',
        entityId: child.id,
      });
    }
    this.logger.log(`Created ${children.length} overdue progress note notifications.`);
  }

  // 2. Service assignments expiring within 7 days
  private async checkExpiringServiceAssignments() {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const assignments = await this.prisma.serviceAssignment.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          lte: sevenDaysFromNow,
          gte: new Date(),
        },
      },
      include: { service: { select: { name: true } } },
    });

    for (const assignment of assignments) {
      await this.createNotification({
        staffId: assignment.assignedStaffId,
        message: `Expiring Service: ${assignment.service.name} assignment is ending on ${assignment.endDate?.toLocaleDateString()}.`,
        type: NotificationType.SERVICE_EXPIRY,
        entityType: 'ServiceAssignment',
        entityId: assignment.id,
      });
    }
    this.logger.log(`Created ${assignments.length} service expiry notifications.`);
  }

  // 3. Documents expiring within 7 days
  private async checkExpiringDocuments() {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const documents = await this.prisma.document.findMany({
      where: {
        expiresAt: {
          lte: sevenDaysFromNow,
          gte: new Date(),
        },
      },
    });

    for (const doc of documents) {
      await this.createNotification({
        staffId: doc.uploadedById,
        message: `Expiring Document: ${doc.name} will expire on ${doc.expiresAt?.toLocaleDateString()}.`,
        type: NotificationType.DOCUMENT_EXPIRY,
        entityType: 'Document',
        entityId: doc.id,
      });
    }
    this.logger.log(`Created ${documents.length} document expiry notifications.`);
  }

  // 4. FundAllocations with status ALLOCATED for more than 14 days
  private async checkStagnantFundAllocations() {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const allocations = await this.prisma.fundAllocation.findMany({
      where: {
        status: FundAllocationStatus.ALLOCATED,
        createdAt: { lte: fourteenDaysAgo },
      },
      include: { parent: { select: { fullName: true } } },
    });

    // Notify all SUPER_ADMINs
    const admins = await this.prisma.staff.findMany({
      where: { role: StaffRole.SUPER_ADMIN, isActive: true },
      select: { id: true },
    });

    for (const allocation of allocations) {
      for (const admin of admins) {
        await this.createNotification({
          staffId: admin.id,
          message: `Stagnant Fund Allocation: ${allocation.parent.fullName} has had funds allocated for over 14 days without disbursement.`,
          type: NotificationType.FUND_REMINDER,
          entityType: 'FundAllocation',
          entityId: allocation.id,
        });
      }
    }
    this.logger.log(`Created stagnant fund notifications for ${allocations.length} records.`);
  }

  // 5. Weekly summary of donations to SUPER_ADMIN
  private async notifyWeeklyDonationSummary() {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const stats = await this.prisma.donation.aggregate({
      where: { donationDate: { gte: oneWeekAgo } },
      _sum: { amount: true },
      _count: true,
    });

    const admins = await this.prisma.staff.findMany({
      where: { role: StaffRole.SUPER_ADMIN, isActive: true },
      select: { id: true },
    });

    const amount = stats._sum.amount || 0;
    const count = stats._count || 0;

    for (const admin of admins) {
      await this.createNotification({
        staffId: admin.id,
        message: `Weekly Donation Summary: Received ${count} donations totaling ${amount} ETB in the last 7 days.`,
        type: NotificationType.GENERAL,
      });
    }
    this.logger.log(`Sent weekly donation summary to ${admins.length} admins.`);
  }
}
