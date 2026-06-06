import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  ChildStatus,
  FundAllocationStatus,
  NotificationType,
  AppointmentStatus,
  StaffRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type NotificationInput = {
  staffId: string;
  message: string;
  type: NotificationType;
  entityType?: string;
  entityId?: string;
};

type NotificationFanOutInput = Omit<NotificationInput, 'staffId'>;

type NotificationOptions = {
  dedupeUnreadByEntity?: boolean;
};

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

  async createNotification(
    data: NotificationInput,
    options: NotificationOptions = {},
  ) {
    if (options.dedupeUnreadByEntity && data.entityType && data.entityId) {
      const existing = await this.prisma.notification.findFirst({
        where: {
          staffId: data.staffId,
          type: data.type,
          entityType: data.entityType,
          entityId: data.entityId,
          isRead: false,
        },
      });

      if (existing) {
        return existing;
      }
    }

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

  async createManyForStaff(
    staffIds: Array<string | null | undefined>,
    data: NotificationFanOutInput,
    options: NotificationOptions = {},
  ) {
    const uniqueStaffIds = this.uniqueStaffIds(staffIds);

    await Promise.all(
      uniqueStaffIds.map((staffId) =>
        this.createNotification({ ...data, staffId }, options),
      ),
    );

    return uniqueStaffIds.length;
  }

  async notifyAdmins(
    data: NotificationFanOutInput,
    options: NotificationOptions = {},
  ) {
    const admins = await this.prisma.staff.findMany({
      where: { role: StaffRole.SUPER_ADMIN, isActive: true },
      select: { id: true },
    });

    return this.createManyForStaff(
      admins.map((admin) => admin.id),
      data,
      options,
    );
  }

  async notifyStaffAndAdmins(
    staffIds: Array<string | null | undefined>,
    data: NotificationFanOutInput,
    options: NotificationOptions = {},
  ) {
    const admins = await this.prisma.staff.findMany({
      where: { role: StaffRole.SUPER_ADMIN, isActive: true },
      select: { id: true },
    });

    return this.createManyForStaff(
      [...staffIds, ...admins.map((admin) => admin.id)],
      data,
      options,
    );
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
      this.checkTomorrowAppointments(),
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

    let created = 0;
    for (const child of children) {
      await this.createNotification({
        staffId: child.assignedStaffId,
        message: `Overdue Progress Note: ${child.fullName} hasn't had a progress note in over 30 days.`,
        type: NotificationType.PROGRESS_OVERDUE,
        entityType: 'Child',
        entityId: child.id,
      }, { dedupeUnreadByEntity: true });
      created += 1;
    }
    this.logger.log(`Checked ${children.length} children and created/deduped ${created} overdue progress notifications.`);
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

    let created = 0;
    for (const assignment of assignments) {
      await this.createNotification({
        staffId: assignment.assignedStaffId,
        message: `Expiring Service: ${assignment.service.name} assignment is ending on ${assignment.endDate?.toLocaleDateString()}.`,
        type: NotificationType.SERVICE_EXPIRY,
        entityType: 'ServiceAssignment',
        entityId: assignment.id,
      }, { dedupeUnreadByEntity: true });
      created += 1;
    }
    this.logger.log(`Checked ${assignments.length} service assignments and created/deduped ${created} expiry notifications.`);
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
      include: {
        parent: { select: { assignedStaffId: true } },
        child: { select: { assignedStaffId: true } },
      },
    });

    let created = 0;
    for (const doc of documents) {
      await this.createNotification({
        staffId:
          doc.child?.assignedStaffId ??
          doc.parent?.assignedStaffId ??
          doc.uploadedById,
        message: `Expiring Document: ${doc.name} will expire on ${doc.expiresAt?.toLocaleDateString()}.`,
        type: NotificationType.DOCUMENT_EXPIRY,
        entityType: 'Document',
        entityId: doc.id,
      }, { dedupeUnreadByEntity: true });
      created += 1;
    }
    this.logger.log(`Checked ${documents.length} documents and created/deduped ${created} expiry notifications.`);
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

    let created = 0;
    for (const allocation of allocations) {
      created += await this.notifyAdmins({
        message: `Stagnant Fund Allocation: ${allocation.parent.fullName} has had funds allocated for over 14 days without disbursement.`,
        type: NotificationType.FUND_REMINDER,
        entityType: 'FundAllocation',
        entityId: allocation.id,
      }, { dedupeUnreadByEntity: true });
    }
    this.logger.log(`Checked ${allocations.length} stagnant funds and created/deduped ${created} admin notifications.`);
  }

  // 5. Appointments scheduled for tomorrow
  private async checkTomorrowAppointments() {
    const now = new Date();
    const tomorrowStart = new Date(now);
    tomorrowStart.setDate(now.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        status: AppointmentStatus.SCHEDULED,
        scheduledAt: {
          gte: tomorrowStart,
          lte: tomorrowEnd,
        },
      },
      include: {
        child: { select: { fullName: true } },
        parent: { select: { fullName: true } },
      },
    });

    let created = 0;
    for (const appointment of appointments) {
      const targetName =
        appointment.child?.fullName ??
        appointment.parent?.fullName ??
        'beneficiary';

      await this.createNotification({
        staffId: appointment.staffId,
        message: `Appointment Reminder: ${appointment.title} for ${targetName} is scheduled tomorrow at ${appointment.scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
        type: NotificationType.GENERAL,
        entityType: 'Appointment',
        entityId: appointment.id,
      }, { dedupeUnreadByEntity: true });
      created += 1;
    }

    this.logger.log(`Checked ${appointments.length} tomorrow appointments and created/deduped ${created} reminders.`);
  }

  // 6. Weekly summary of donations to SUPER_ADMIN
  private async notifyWeeklyDonationSummary() {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const stats = await this.prisma.donation.aggregate({
      where: { donationDate: { gte: oneWeekAgo } },
      _sum: { amount: true },
      _count: true,
    });

    const amount = stats._sum.amount || 0;
    const count = stats._count || 0;
    const summaryDate = new Date().toISOString().slice(0, 10);

    const sent = await this.notifyAdmins({
      message: `Weekly Donation Summary: Received ${count} donations totaling ${amount} ETB in the last 7 days.`,
      type: NotificationType.GENERAL,
      entityType: 'DonationSummary',
      entityId: summaryDate,
    }, { dedupeUnreadByEntity: true });

    this.logger.log(`Sent weekly donation summary to ${sent} admins.`);
  }

  private uniqueStaffIds(staffIds: Array<string | null | undefined>) {
    return [...new Set(staffIds.filter((staffId): staffId is string => Boolean(staffId)))];
  }
}
