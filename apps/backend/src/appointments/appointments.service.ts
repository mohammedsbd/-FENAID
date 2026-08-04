import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, NotificationType, Prisma, StaffRole } from '@prisma/client';
import { checkOptimisticLock } from '../common/utils/optimistic-lock';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAppointmentDto,
  ListAppointmentsDto,
  LogAttendanceDto,
  UpdateAppointmentDto,
} from './dto/appointment.dto';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { I18nService } from '../i18n/i18n.service';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly i18n: I18nService,
  ) {}

  async create(staffId: string, dto: CreateAppointmentDto) {
    const appointment = await this.prisma.$transaction(async (tx) => {
      const a = await tx.appointment.create({
        data: {
          title: dto.title,
          staffId: dto.staffId || staffId,
          childId: dto.childId,
          parentId: dto.parentId,
          scheduledAt: new Date(dto.scheduledAt),
          durationMinutes: dto.durationMinutes ?? 60,
          type: dto.type,
          isRecurring: dto.isRecurring ?? false,
          recurrenceRule: dto.recurrenceRule,
          status: dto.status ?? AppointmentStatus.SCHEDULED,
        },
        include: {
          child: { select: { fullName: true } },
          parent: { select: { fullName: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          staffId,
          action: 'CREATE',
          entity: 'Appointment',
          entityId: a.id,
          changes: { after: JSON.parse(JSON.stringify(a)) },
        },
      });

      return a;
    });

    const targetName =
      appointment.child?.fullName ??
      appointment.parent?.fullName ??
      'beneficiary';

    await this.notifications.createNotification({
      staffId: appointment.staffId,
      notificationKey: 'notification.appointmentScheduled',
      params: { title: appointment.title, targetName, date: appointment.scheduledAt.toLocaleString() },
      type: NotificationType.GENERAL,
      entityType: 'Appointment',
      entityId: appointment.id,
    });

    return appointment;
  }

  async findAll(user: JwtPayload, query: ListAppointmentsDto) {
    const where: Prisma.AppointmentWhereInput = {
      deletedAt: null,
      ...(user.role !== StaffRole.SUPER_ADMIN ? { staffId: user.staffId } : {}),
      ...(query.staffId && { staffId: query.staffId }),
      ...(query.childId && { childId: query.childId }),
      ...(query.parentId && { parentId: query.parentId }),
      ...(query.status && { status: query.status }),
      ...(query.type && { type: query.type }),
      ...(query.startDate || query.endDate
        ? {
            scheduledAt: {
              ...(query.startDate && { gte: new Date(query.startDate) }),
              ...(query.endDate && { lte: new Date(query.endDate) }),
            },
          }
        : {}),
    };

    return this.prisma.appointment.findMany({
      where,
      take: 1000,
      include: {
        staff: { select: { fullName: true } },
        child: { select: { fullName: true, photoUrl: true } },
        parent: { select: { fullName: true, photoUrl: true } },
        attendanceRecords: true,
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async getCalendar(user: JwtPayload, month: string, query: ListAppointmentsDto) {
    // month format: YYYY-MM
    const date = new Date(`${month}-01`);
    if (isNaN(date.getTime())) {
      throw new BadRequestException('error.appointment.invalidMonth');
    }

    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

    const where: Prisma.AppointmentWhereInput = {
      deletedAt: null,
      scheduledAt: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
      ...(query.staffId && { staffId: query.staffId }),
      ...(query.childId && { childId: query.childId }),
      ...(query.parentId && { parentId: query.parentId }),
      ...(query.status && { status: query.status }),
      ...(query.type && { type: query.type }),
      ...(user.role !== StaffRole.SUPER_ADMIN ? { staffId: user.staffId } : {}),
    };

    const appointments = await this.prisma.appointment.findMany({
      where,
      include: {
        staff: { select: { fullName: true } },
        child: { select: { fullName: true, photoUrl: true } },
        parent: { select: { fullName: true, photoUrl: true } },
        attendanceRecords: true,
      },
      orderBy: { scheduledAt: 'asc' },
    });

    // Group by day
    return appointments.reduce((acc, app) => {
      const day = app.scheduledAt.toISOString().slice(0, 10);
      if (!acc[day]) acc[day] = [];
      acc[day].push(app);
      return acc;
    }, {} as Record<string, typeof appointments>);
  }

  async findOne(user: JwtPayload, id: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id,
        ...(user.role !== StaffRole.SUPER_ADMIN ? { staffId: user.staffId } : {}),
      },
      include: {
        staff: { select: { fullName: true, id: true } },
        child: { select: { fullName: true, id: true, photoUrl: true } },
        parent: { select: { fullName: true, id: true, photoUrl: true } },
        attendanceRecords: {
          include: {
            parent: { select: { fullName: true } },
            child: { select: { fullName: true } },
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('error.appointment.notFound');
    }

    return appointment;
  }

  private async findById(id: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, deletedAt: null },
      include: {
        staff: { select: { fullName: true, id: true } },
        child: { select: { fullName: true, id: true, photoUrl: true } },
        parent: { select: { fullName: true, id: true, photoUrl: true } },
        attendanceRecords: {
          include: {
            parent: { select: { fullName: true } },
            child: { select: { fullName: true } },
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('error.appointment.notFound');
    }

    return appointment;
  }

  async update(staffId: string, id: string, dto: UpdateAppointmentDto) {
    const existing = await this.findById(id);
    checkOptimisticLock(existing.updatedAt, dto.expectedUpdatedAt, 'Appointment');

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.appointment.update({
        where: { id },
        data: {
          title: dto.title,
          staffId: dto.staffId,
          childId: dto.childId,
          parentId: dto.parentId,
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
          durationMinutes: dto.durationMinutes,
          type: dto.type,
          isRecurring: dto.isRecurring,
          recurrenceRule: dto.recurrenceRule,
          status: dto.status,
        },
        include: {
          child: { select: { fullName: true } },
          parent: { select: { fullName: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          staffId,
          action: 'UPDATE',
          entity: 'Appointment',
          entityId: id,
          changes: {
            before: JSON.parse(JSON.stringify(existing)),
            after: JSON.parse(JSON.stringify(u)),
          },
        },
      });

      return u;
    });

    await this.notifications.createNotification({
      staffId: updated.staffId,
      notificationKey: 'notification.appointmentUpdated',
      params: { title: updated.title, status: updated.status, date: updated.scheduledAt.toLocaleString() },
      type: NotificationType.GENERAL,
      entityType: 'Appointment',
      entityId: updated.id,
    });

    return updated;
  }

  async remove(staffId: string, id: string) {
    const existing = await this.findById(id);
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.appointment.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          staffId,
          action: 'DELETE',
          entity: 'Appointment',
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

  // Attendance
  async logAttendance(staffId: string, appointmentId: string, dto: LogAttendanceDto) {
    const appointment = await this.findById(appointmentId); // Ensure appointment exists

    const records = await this.prisma.$transaction(async (tx) => {
      const created = await Promise.all(
        dto.records.map((record) =>
          tx.attendanceRecord.create({
            data: {
              appointmentId,
              parentId: record.targetType === 'PARENT' ? record.targetId : null,
              childId: record.targetType === 'CHILD' ? record.targetId : null,
              status: record.status,
              notes: record.notes,
            },
          }),
        ),
      );

      if (dto.appointmentStatus && dto.appointmentStatus !== appointment.status) {
        await tx.appointment.update({
          where: { id: appointmentId },
          data: { status: dto.appointmentStatus },
        });
      }

      await tx.auditLog.create({
        data: {
          staffId,
          action: 'LOG_ATTENDANCE',
          entity: 'Appointment',
          entityId: appointmentId,
          changes: {
            count: created.length,
            recordIds: created.map((r) => r.id),
            newStatus: dto.appointmentStatus,
          },
        },
      });

      return created;
    });

    await this.notifications.createNotification({
      staffId: appointment.staff.id,
      notificationKey: 'notification.attendanceLogged',
      params: { count: records.length, title: appointment.title },
      type: NotificationType.GENERAL,
      entityType: 'Appointment',
      entityId: appointmentId,
    });

    return records;
  }

  async getAttendance(user: JwtPayload, appointmentId: string) {
    return this.prisma.attendanceRecord.findMany({
      where: { appointmentId },
      include: {
        parent: { select: { fullName: true } },
        child: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

}
