import { Injectable, Logger } from '@nestjs/common';
import {
  ChildStatus,
  FundAllocationStatus,
  ParentStatus,
  Prisma,
  ServiceAssignmentStatus,
  StaffRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { ReportQueryDto, ReportType } from './dto/report-query.dto';

@Injectable()
export class DashboardReportsService {
  private readonly logger = new Logger(DashboardReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAdminDashboard() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    // Wrap the heavy parallel query in try/catch to prevent a single query failure from
    // taking down the entire dashboard page.
    const results = await this.safeParallelQueries(now, startOfWeek, endOfWeek);

    // Overdue progress notes: children with no note in 30 days
    let overdueNotes: Array<{ id: string; fullName: string; photoUrl: string | null; assignedStaff: { fullName: string } | null }> = [];
    try {
      overdueNotes = await this.prisma.child.findMany({
        where: {
          status: ChildStatus.ACTIVE,
          progressNotes: {
            none: {
              createdAt: { gte: thirtyDaysAgo },
            },
          },
        },
        select: {
          id: true,
          fullName: true,
          photoUrl: true,
          assignedStaff: { select: { fullName: true } },
        },
      });
    } catch (error) {
      this.logger.error('Failed to fetch overdue progress notes', (error as Error).stack);
    }

    return {
      stats: {
        totalParents: results.totalParents,
        totalChildren: results.totalChildren,
        activeParents: results.activeParents,
        activeChildren: results.activeChildren,
        totalFundsAllocated: results.fundsAllocated,
        totalFundsDisbursed: results.fundsDisbursed,
        totalDonationsThisYear: results.donationsThisYear,
      },
      childrenByDisabilityType: results.childrenByDisabilityType,
      childrenBySeverity: results.childrenBySeverity,
      servicesByStatus: results.servicesByStatus,
      caseWorkerWorkload: results.caseWorkerWorkload,
      upcomingAppointmentsThisWeek: results.upcomingAppointmentsCount,
      recentRegistrations: {
        parents: results.recentParents,
        children: results.recentChildren,
      },
      overdueProgressNotes: overdueNotes,
      pendingFundDisbursements: results.pendingDisbursements,
      donationSummary: results.donationSummary,
    };
  }

  private async safeParallelQueries(
    now: Date,
    startOfWeek: Date,
    endOfWeek: Date,
  ) {
    const defaults = {
      totalParents: 0,
      totalChildren: 0,
      activeParents: 0,
      activeChildren: 0,
      fundsAllocated: 0,
      fundsDisbursed: 0,
      donationsThisYear: 0,
      childrenByDisabilityType: [] as Array<{ type: string; count: number }>,
      childrenBySeverity: [] as Array<{ level: string; count: number }>,
      servicesByStatus: [] as Array<{ status: string; count: number }>,
      caseWorkerWorkload: [] as Array<{
        staffId: string;
        staffName: string;
        parentCount: number;
        childCount: number;
      }>,
      upcomingAppointmentsCount: [] as Array<Record<string, unknown>>,
      recentParents: [] as Array<Record<string, unknown>>,
      recentChildren: [] as Array<Record<string, unknown>>,
      pendingDisbursements: [] as Array<Record<string, unknown>>,
      donationSummary: {
        thisMonth: 0,
        thisYear: 0,
        byDonorType: [] as Array<{ type: string; total: number }>,
      },
    };

    try {
      const [
        totalParents,
        totalChildren,
        activeParents,
        activeChildren,
        fundsAllocated,
        fundsDisbursed,
        donationsThisYear,
        childrenByDisabilityType,
        childrenBySeverity,
        servicesByStatus,
        staffWorkload,
        upcomingAppointmentsCount,
        recentParents,
        recentChildren,
        pendingDisbursements,
        donationSummary,
      ] = await Promise.all([
        this.prisma.parent.count(),
        this.prisma.child.count(),
        this.prisma.parent.count({ where: { status: ParentStatus.ACTIVE } }),
        this.prisma.child.count({ where: { status: ChildStatus.ACTIVE } }),
        this.prisma.fundAllocation.aggregate({ _sum: { amount: true } }),
        this.prisma.fundAllocation.aggregate({
          where: { status: FundAllocationStatus.DISBURSED },
          _sum: { amount: true },
        }),
        this.prisma.donation.aggregate({
          where: { donationDate: { gte: new Date(now.getFullYear(), 0, 1) } },
          _sum: { amount: true },
        }),
        this.prisma.child.groupBy({ by: ['disabilityType'], _count: true }),
        this.prisma.child.groupBy({ by: ['severityLevel'], _count: true }),
        this.prisma.serviceAssignment.groupBy({ by: ['status'], _count: true }),
        this.prisma.staff.findMany({
          where: { role: { in: ['CASE_WORKER', 'SUPER_ADMIN'] } },
          select: {
            id: true,
            fullName: true,
            _count: {
              select: { assignedParents: true, assignedChildren: true },
            },
          },
        }),
        this.prisma.appointment.findMany({
          where: { scheduledAt: { gte: startOfWeek, lte: endOfWeek } },
          include: {
            child: { select: { fullName: true, photoUrl: true } },
            parent: { select: { fullName: true, photoUrl: true } },
          },
          orderBy: { scheduledAt: 'asc' },
        }),
        this.prisma.parent.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            fullName: true,
            photoUrl: true,
            createdAt: true,
          },
        }),
        this.prisma.child.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            fullName: true,
            photoUrl: true,
            createdAt: true,
          },
        }),
        this.prisma.fundAllocation.findMany({
          where: {
            status: {
              in: [
                FundAllocationStatus.ALLOCATED,
                FundAllocationStatus.PARTIALLY_DISBURSED,
              ],
            },
          },
          include: { parent: { select: { fullName: true, photoUrl: true } } },
          orderBy: { allocationDate: 'desc' },
        }),
        this.getDonationStats(),
      ]);

      return {
        totalParents,
        totalChildren,
        activeParents,
        activeChildren,
        fundsAllocated: Number(fundsAllocated._sum.amount ?? 0),
        fundsDisbursed: Number(fundsDisbursed._sum.amount ?? 0),
        donationsThisYear: Number(donationsThisYear._sum.amount ?? 0),
        childrenByDisabilityType: childrenByDisabilityType.map((g) => ({
          type: g.disabilityType,
          count: g._count,
        })),
        childrenBySeverity: childrenBySeverity.map((g) => ({
          level: g.severityLevel,
          count: g._count,
        })),
        servicesByStatus: servicesByStatus.map((g) => ({
          status: g.status,
          count: g._count,
        })),
        caseWorkerWorkload: staffWorkload.map((s) => ({
          staffId: s.id,
          staffName: s.fullName,
          parentCount: s._count.assignedParents,
          childCount: s._count.assignedChildren,
        })),
        upcomingAppointmentsCount,
        recentParents,
        recentChildren,
        pendingDisbursements,
        donationSummary,
      };
    } catch (error) {
      this.logger.error(
        'Dashboard parallel queries failed',
        (error as Error).stack,
      );
      return defaults;
    }
  }

  async getStaffDashboard(staffId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [myParents, myChildren, upcomingAppointments, pendingAssignments] =
      await Promise.all([
        this.prisma.parent.count({ where: { assignedStaffId: staffId } }),
        this.prisma.child.count({ where: { assignedStaffId: staffId } }),
        this.prisma.appointment.findMany({
          where: {
            staffId,
            scheduledAt: { gte: now, lte: nextWeek },
          },
          include: {
            child: { select: { fullName: true, photoUrl: true } },
            parent: { select: { fullName: true, photoUrl: true } },
          },
          orderBy: { scheduledAt: 'asc' },
        }),
        this.prisma.serviceAssignment.findMany({
          where: {
            assignedStaffId: staffId,
            status: ServiceAssignmentStatus.PENDING,
          },
          include: {
            service: { select: { name: true } },
            parent: { select: { fullName: true, photoUrl: true } },
            child: { select: { fullName: true, photoUrl: true } },
          },
        }),
      ]);

    const overdueNotes = await this.prisma.child.findMany({
      where: {
        assignedStaffId: staffId,
        status: ChildStatus.ACTIVE,
        progressNotes: {
          none: {
            createdAt: { gte: thirtyDaysAgo },
          },
        },
      },
      select: { id: true, fullName: true, photoUrl: true },
    });

    return {
      myParents,
      myChildren,
      myUpcomingAppointments: upcomingAppointments,
      myChildrenWithOverdueNotes: overdueNotes,
      myPendingServiceAssignments: pendingAssignments,
    };
  }

  async generateReport(user: JwtPayload, type: ReportType, query: ReportQueryDto) {
    const dateFilter = {
      ...(query.startDate && { gte: new Date(query.startDate) }),
      ...(query.endDate && { lte: new Date(query.endDate) }),
    };

    const staffFilter = user.role !== StaffRole.SUPER_ADMIN
      ? { assignedStaffId: user.staffId }
      : {};

    switch (type) {
      case ReportType.MEMBER_DIRECTORY:
        return {
          parents: await this.prisma.parent.findMany({
            where: staffFilter,
            include: { children: { select: { fullName: true, photoUrl: true } } },
          }),
          children: await this.prisma.child.findMany({
            where: staffFilter,
            include: { parent: { select: { fullName: true, photoUrl: true } } },
          }),
        };

      case ReportType.SERVICE_UTILIZATION:
        return this.prisma.service.findMany({
          include: {
            _count: { select: { assignments: true } },
            assignments: {
              where: staffFilter,
              select: { status: true },
            },
          },
        });

      case ReportType.PROGRESS_SUMMARY:
        return this.prisma.child.findMany({
          where: staffFilter,
          include: {
            milestones: true,
            goals: true,
            progressNotes: { take: 5, orderBy: { createdAt: 'desc' } },
          },
        });

      case ReportType.FUND_ALLOCATION_LOG:
        return this.prisma.fundAllocation.findMany({
          where: {
            allocationDate: dateFilter,
            ...(user.role !== StaffRole.SUPER_ADMIN
              ? { parent: { assignedStaffId: user.staffId } }
              : {}),
          },
          include: { parent: { select: { fullName: true, nationalId: true, photoUrl: true } } },
          orderBy: { allocationDate: 'desc' },
        });

      case ReportType.DONATION_LOG:
        return this.prisma.donation.findMany({
          where: { donationDate: dateFilter },
          orderBy: { donationDate: 'desc' },
        });

      case ReportType.STAFF_ACTIVITY:
        return this.prisma.staff.findMany({
          select: {
            id: true,
            fullName: true,
            role: true,
            auditLogs: {
              where: { createdAt: dateFilter },
              orderBy: { createdAt: 'desc' },
              take: 50,
            },
          },
        });

      default:
        throw new Error('Unsupported report type');
    }
  }

  private async getDonationStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [thisMonth, thisYear, byType] = await Promise.all([
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
      thisMonth: thisMonth._sum.amount || 0,
      thisYear: thisYear._sum.amount || 0,
      byDonorType: byType.map((g) => ({ type: g.donorType, total: g._sum.amount || 0 })),
    };
  }
}
