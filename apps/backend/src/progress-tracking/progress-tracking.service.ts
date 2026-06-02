import { Injectable, NotFoundException } from '@nestjs/common';
import { GoalType, MilestoneStatus, Prisma } from '@prisma/client';
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

@Injectable()
export class ProgressTrackingService {
  constructor(private readonly prisma: PrismaService) {}

  // Progress Notes
  async createProgressNote(staffId: string, dto: CreateProgressNoteDto) {
    return this.prisma.progressNote.create({
      data: {
        childId: dto.childId,
        staffId: staffId,
        note: dto.note,
      },
      include: {
        staff: { select: { fullName: true } },
      },
    });
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
    });

    await this.logAudit(staffId, 'CREATE', 'Milestone', milestone.id, milestone);
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
    if (!existing) throw new NotFoundException('Milestone not found');

    const updated = await this.prisma.milestone.update({
      where: { id },
      data: {
        status: dto.status,
        description: dto.description,
      },
    });

    await this.logAudit(staffId, 'UPDATE', 'Milestone', id, updated, existing);
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
    });

    await this.logAudit(staffId, 'CREATE', 'Goal', goal.id, goal);
    return goal;
  }

  async findGoalsByChild(childId: string, query: ListGoalsDto) {
    return this.prisma.goal.findMany({
      where: {
        childId,
        ...(query.type && { type: query.type }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateGoal(staffId: string, id: string, dto: UpdateGoalDto) {
    const existing = await this.prisma.goal.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Goal not found');

    const updated = await this.prisma.goal.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        ...(dto.isAchieved && { achievedAt: new Date() }),
        ...(dto.isAchieved === false && { achievedAt: null }),
      },
    });

    await this.logAudit(staffId, 'UPDATE', 'Goal', id, updated, existing);
    return updated;
  }

  async removeGoal(staffId: string, id: string) {
    const existing = await this.prisma.goal.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Goal not found');

    await this.prisma.goal.delete({ where: { id } });

    await this.logAudit(staffId, 'DELETE', 'Goal', id, null, existing);
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
