import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, NotificationType, Prisma, StaffRole } from '@prisma/client';
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
    const appointment = await this.prisma.appointment.create({
      data: {
        title: dto.title,
        staffId: dto.staffId,
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

    await this.logAudit(staffId, 'CREATE', 'Appointment', appointment.id, appointment);

    const targetName =
      appointment.child?.fullName ??
      appointment.parent?.fullName ??
      'beneficiary';

    await this.notifications.createNotification({
      staffId: appointment.staffId,
      message: this.i18n.t('notification.appointmentScheduled', { title: appointment.title, targetName, date: appointment.scheduledAt.toLocaleString() }),
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

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        title: dto.title,
        staffId: dto.staffId,
        childId: dto.childId,
        parentId: dto.parentId,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        durationMinutes: dto.durationMinutes,
        status: dto.status,
      },
      include: {
        child: { select: { fullName: true } },
        parent: { select: { fullName: true } },
      },
    });

    await this.logAudit(staffId, 'UPDATE', 'Appointment', id, updated, existing);

    await this.notifications.createNotification({
      staffId: updated.staffId,
      message: this.i18n.t('notification.appointmentUpdated', { title: updated.title, status: updated.status, date: updated.scheduledAt.toLocaleString() }),
      type: NotificationType.GENERAL,
      entityType: 'Appointment',
      entityId: updated.id,
    });

    return updated;
  }

  async remove(staffId: string, id: string) {
    const existing = await this.findById(id);
    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.logAudit(staffId, 'DELETE', 'Appointment', id, updated, existing);
    return { success: true };
  }

  // Attendance
  async logAttendance(staffId: string, appointmentId: string, dto: LogAttendanceDto) {
    const appointment = await this.findById(appointmentId); // Ensure appointment exists

    const records = await Promise.all(
      dto.records.map((record) =>
        this.prisma.attendanceRecord.create({
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
      await this.prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: dto.appointmentStatus },
      });
    }

    await this.logAudit(staffId, 'LOG_ATTENDANCE', 'Appointment', appointmentId, {
      count: records.length,
      recordIds: records.map((r) => r.id),
      newStatus: dto.appointmentStatus,
    });

    await this.notifications.createNotification({
      staffId: appointment.staff.id,
      message: this.i18n.t('notification.attendanceLogged', { count: records.length, title: appointment.title }),
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
