import { Injectable, NotFoundException } from '@nestjs/common';
import { GoalType, MilestoneStatus, NotificationType, Prisma } from '@prisma/client';
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
    const note = await this.prisma.progressNote.create({
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

    await this.logAudit(staffId, 'CREATE', 'ProgressNote', note.id, note);

    await this.notifications.notifyStaffAndAdmins([note.child.assignedStaffId], {
      message: this.i18n.t('notification.progressNoteAdded', { childName: note.child.fullName, staffName: note.staff.fullName }),
      type: NotificationType.GENERAL,
      entityType: 'Child',
      entityId: note.childId,
    });

    return note;
  }

  async findProgressNotesByChild(childId: string, query: ListProgressNotesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
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
    const milestone = await this.prisma.milestone.create({
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

    await this.logAudit(staffId, 'CREATE', 'Milestone', milestone.id, milestone);

    await this.notifications.notifyStaffAndAdmins([milestone.child.assignedStaffId], {
      message: this.i18n.t('notification.milestoneAdded', { title: milestone.title, childName: milestone.child.fullName }),
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

    const updated = await this.prisma.milestone.update({
      where: { id },
      data: {
        status: dto.status,
        description: dto.description,
      },
      include: {
        child: { select: { fullName: true, assignedStaffId: true } },
      },
    });

    await this.logAudit(staffId, 'UPDATE', 'Milestone', id, updated, existing);

    await this.notifications.notifyStaffAndAdmins([updated.child.assignedStaffId], {
      message: this.i18n.t('notification.milestoneUpdated', { title: updated.title, childName: updated.child.fullName, status: updated.status }),
      type: NotificationType.GENERAL,
      entityType: 'Child',
      entityId: updated.childId,
    });

    return updated;
  }

  // Goals
  async createGoal(staffId: string, dto: CreateGoalDto) {
    const goal = await this.prisma.goal.create({
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

    await this.logAudit(staffId, 'CREATE', 'Goal', goal.id, goal);

    await this.notifications.notifyStaffAndAdmins([goal.child.assignedStaffId], {
      message: this.i18n.t('notification.goalAdded', { title: goal.title, childName: goal.child.fullName }),
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

    const updated = await this.prisma.goal.update({
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

    await this.logAudit(staffId, 'UPDATE', 'Goal', id, updated, existing);

    await this.notifications.notifyStaffAndAdmins([updated.child.assignedStaffId], {
      message: this.i18n.t('notification.goalUpdated', { title: updated.title, childName: updated.child.fullName, achieved: updated.achievedAt ? ' has been achieved' : '' }),
      type: NotificationType.GENERAL,
      entityType: 'Child',
      entityId: updated.childId,
    });

    return updated;
  }

  async removeGoal(staffId: string, id: string) {
    const existing = await this.prisma.goal.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('error.progress.goalNotFound');

    const updated = await this.prisma.goal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.logAudit(staffId, 'DELETE', 'Goal', id, updated, existing);
    return { success: true };
  }

  private async logAudit(
    staffId: string,
    action: string,
    entity: string,
    entityId: string,
    after: any,
    before?: any,
  ) {
    await this.prisma.auditLog.create({
      data: {
        staffId,
        action,
        entity,
        entityId,
        changes: {
          before: before ? JSON.parse(JSON.stringify(before)) : null,
          after: after ? JSON.parse(JSON.stringify(after)) : null,
        },
      },
    });
  }
}
