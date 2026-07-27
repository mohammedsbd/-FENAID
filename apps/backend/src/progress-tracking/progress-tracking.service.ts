import { Injectable, NotFoundException } from '@nestjs/common';
import { GoalType, MilestoneStatus, NotificationType, Prisma } from '@prisma/client';
import { checkOptimisticLock } from '../common/utils/optimistic-lock';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateGoalDto,
  CreateMilestoneDto,
  CreateProgressNoteDto,
  ListGoalsDto,
  ListProgressNotesDto,
  UpdateGoalDto,
  UpdateMilestoneDto,
} from './dto/progress-tracking.dto';
import { I18nService } from '../i18n/i18n.service';

@Injectable()
export class ProgressTrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly i18n: I18nService,
  ) {}

  // Progress Notes
  async createProgressNote(staffId: string, dto: CreateProgressNoteDto) {
    const note = await this.prisma.$transaction(async (tx) => {
      const n = await tx.progressNote.create({
        data: {
          childId: dto.childId,
          staffId: staffId,
          note: dto.note,
        },
        include: {
          staff: { select: { fullName: true } },
          child: { select: { fullName: true, assignedStaffId: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          staffId,
          action: 'CREATE',
          entity: 'ProgressNote',
          entityId: n.id,
          changes: { after: JSON.parse(JSON.stringify(n)) },
        },
      });

      return n;
    });

    await this.notifications.notifyStaffAndAdmins([note.child.assignedStaffId], {
      notificationKey: 'notification.progressNoteAdded',
      params: { childName: note.child.fullName, staffName: note.staff.fullName },
      type: NotificationType.GENERAL,
      entityType: 'Child',
      entityId: note.childId,
    });

    return note;
  }

  async findProgressNotesByChild(childId: string, query: ListProgressNotesDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.progressNote.findMany({
        where: { childId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          staff: { select: { fullName: true } },
        },
      }),
      this.prisma.progressNote.count({ where: { childId } }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Milestones
  async createMilestone(staffId: string, dto: CreateMilestoneDto) {
    const milestone = await this.prisma.$transaction(async (tx) => {
      const m = await tx.milestone.create({
        data: {
          childId: dto.childId,
          title: dto.title,
          description: dto.description,
          status: dto.status ?? MilestoneStatus.NOT_STARTED,
        },
        include: {
          child: { select: { fullName: true, assignedStaffId: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          staffId,
          action: 'CREATE',
          entity: 'Milestone',
          entityId: m.id,
          changes: { after: JSON.parse(JSON.stringify(m)) },
        },
      });

      return m;
    });

    await this.notifications.notifyStaffAndAdmins([milestone.child.assignedStaffId], {
      notificationKey: 'notification.milestoneAdded',
      params: { title: milestone.title, childName: milestone.child.fullName },
      type: NotificationType.GENERAL,
      entityType: 'Child',
      entityId: milestone.childId,
    });

    return milestone;
  }

  async findMilestonesByChild(childId: string) {
    const milestones = await this.prisma.milestone.findMany({
      where: { childId },
      orderBy: { createdAt: 'desc' },
    });

    // Group by status
    return milestones.reduce((acc, milestone) => {
      const status = milestone.status;
      if (!acc[status]) acc[status] = [];
      acc[status].push(milestone);
      return acc;
    }, {} as Record<MilestoneStatus, typeof milestones>);
  }

  async updateMilestone(staffId: string, id: string, dto: UpdateMilestoneDto) {
    const existing = await this.prisma.milestone.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('error.progress.milestoneNotFound');
    checkOptimisticLock(existing.updatedAt, dto.expectedUpdatedAt, 'Milestone');

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.milestone.update({
        where: { id },
        data: {
          status: dto.status,
          description: dto.description,
        },
        include: {
          child: { select: { fullName: true, assignedStaffId: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          staffId,
          action: 'UPDATE',
          entity: 'Milestone',
          entityId: id,
          changes: {
            before: JSON.parse(JSON.stringify(existing)),
            after: JSON.parse(JSON.stringify(u)),
          },
        },
      });

      return u;
    });

    await this.notifications.notifyStaffAndAdmins([updated.child.assignedStaffId], {
      notificationKey: 'notification.milestoneUpdated',
      params: { title: updated.title, childName: updated.child.fullName, status: updated.status },
      type: NotificationType.GENERAL,
      entityType: 'Child',
      entityId: updated.childId,
    });

    return updated;
  }

  // Goals
  async createGoal(staffId: string, dto: CreateGoalDto) {
    const goal = await this.prisma.$transaction(async (tx) => {
      const g = await tx.goal.create({
        data: {
          childId: dto.childId,
          staffId: staffId,
          title: dto.title,
          description: dto.description,
          type: dto.type,
        },
        include: {
          child: { select: { fullName: true, assignedStaffId: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          staffId,
          action: 'CREATE',
          entity: 'Goal',
          entityId: g.id,
          changes: { after: JSON.parse(JSON.stringify(g)) },
        },
      });

      return g;
    });

    await this.notifications.notifyStaffAndAdmins([goal.child.assignedStaffId], {
      notificationKey: 'notification.goalAdded',
      params: { title: goal.title, childName: goal.child.fullName },
      type: NotificationType.GENERAL,
      entityType: 'Child',
      entityId: goal.childId,
    });

    return goal;
  }

  async findGoalsByChild(childId: string, query: ListGoalsDto) {
    return this.prisma.goal.findMany({
      where: {
        childId,
        deletedAt: null,
        ...(query.type && { type: query.type }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateGoal(staffId: string, id: string, dto: UpdateGoalDto) {
    const existing = await this.prisma.goal.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('error.progress.goalNotFound');
    checkOptimisticLock(existing.updatedAt, dto.expectedUpdatedAt, 'Goal');

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.goal.update({
        where: { id },
        data: {
          title: dto.title,
          description: dto.description,
          type: dto.type,
          ...(dto.isAchieved && { achievedAt: new Date() }),
          ...(dto.isAchieved === false && { achievedAt: null }),
        },
        include: {
          child: { select: { fullName: true, assignedStaffId: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          staffId,
          action: 'UPDATE',
          entity: 'Goal',
          entityId: id,
          changes: {
            before: JSON.parse(JSON.stringify(existing)),
            after: JSON.parse(JSON.stringify(u)),
          },
        },
      });

      return u;
    });

    await this.notifications.notifyStaffAndAdmins([updated.child.assignedStaffId], {
      notificationKey: 'notification.goalUpdated',
      params: { title: updated.title, childName: updated.child.fullName, achieved: updated.achievedAt ? ' has been achieved' : '' },
      type: NotificationType.GENERAL,
      entityType: 'Child',
      entityId: updated.childId,
    });

    return updated;
  }

  async removeGoal(staffId: string, id: string) {
    const existing = await this.prisma.goal.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('error.progress.goalNotFound');

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.goal.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          staffId,
          action: 'DELETE',
          entity: 'Goal',
          entityId: id,
          changes: {
            before: JSON.parse(JSON.stringify(existing)),
            after: JSON.parse(JSON.stringify(u)),
          },
        },
      });

      return u;
    });

    return { success: true };
  }

}
