import { Injectable } from '@nestjs/common';
import {
  ChildStatus,
  FundAllocationStatus,
  ParentStatus,
  Prisma,
  ServiceAssignmentStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReportQueryDto, ReportType } from './dto/report-query.dto';

@Injectable()
export class DashboardReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminDashboard() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

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
          child: { select: { fullName: true } },
          parent: { select: { fullName: true } },
        },
        orderBy: { scheduledAt: 'asc' },
      }),
      this.prisma.parent.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, fullName: true, createdAt: true },
      }),
      this.prisma.child.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, fullName: true, createdAt: true },
      }),
      this.prisma.fundAllocation.findMany({
        where: { status: FundAllocationStatus.ALLOCATED },
        include: { parent: { select: { fullName: true } } },
        orderBy: { allocationDate: 'desc' },
      }),
      this.getDonationStats(),
    ]);

    // Overdue progress notes: children with no note in 30 days
    // This is more complex: find children where NO note exists with createdAt > thirtyDaysAgo
    const overdueNotes = await this.prisma.child.findMany({
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
        assignedStaff: { select: { fullName: true } },
      },
    });

    return {
      stats: {
        totalParents,
        totalChildren,
        activeParents,
        activeChildren,
        totalFundsAllocated: fundsAllocated._sum.amount || 0,
        totalFundsDisbursed: fundsDisbursed._sum.amount || 0,
        totalDonationsThisYear: donationsThisYear._sum.amount || 0,
      },
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
      upcomingAppointmentsThisWeek: upcomingAppointmentsCount,
      recentRegistrations: {
        parents: recentParents,
        children: recentChildren,
      },
      overdueProgressNotes: overdueNotes,
      pendingFundDisbursements: pendingDisbursements,
      donationSummary,
    };
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
            child: { select: { fullName: true } },
            parent: { select: { fullName: true } },
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
            parent: { select: { fullName: true } },
            child: { select: { fullName: true } },
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
      select: { id: true, fullName: true },
    });

    return {
      myParents,
      myChildren,
      myUpcomingAppointments: upcomingAppointments,
      myChildrenWithOverdueNotes: overdueNotes,
      myPendingServiceAssignments: pendingAssignments,
    };
  }

  async generateReport(type: ReportType, query: ReportQueryDto) {
    const dateFilter = {
      ...(query.startDate && { gte: new Date(query.startDate) }),
      ...(query.endDate && { lte: new Date(query.endDate) }),
    };

    switch (type) {
      case ReportType.MEMBER_DIRECTORY:
        return {
          parents: await this.prisma.parent.findMany({
            include: { children: { select: { fullName: true } } },
          }),
          children: await this.prisma.child.findMany({
            include: { parent: { select: { fullName: true } } },
          }),
        };

      case ReportType.SERVICE_UTILIZATION:
        return this.prisma.service.findMany({
          include: {
            _count: { select: { assignments: true } },
            assignments: {
              select: { status: true },
            },
          },
        });

      case ReportType.PROGRESS_SUMMARY:
        return this.prisma.child.findMany({
          include: {
            milestones: true,
            goals: true,
            progressNotes: { take: 5, orderBy: { createdAt: 'desc' } },
          },
        });

      case ReportType.FUND_ALLOCATION_LOG:
        return this.prisma.fundAllocation.findMany({
          where: { allocationDate: dateFilter },
          include: { parent: { select: { fullName: true, nationalId: true } } },
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
