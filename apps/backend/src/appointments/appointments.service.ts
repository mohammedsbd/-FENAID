import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, NotificationType, Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAppointmentDto,
  ListAppointmentsDto,
  LogAttendanceDto,
  UpdateAppointmentDto,
} from './dto/appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
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
      message: `Appointment scheduled: ${appointment.title} for ${targetName} on ${appointment.scheduledAt.toLocaleString()}.`,
      type: NotificationType.GENERAL,
      entityType: 'Appointment',
      entityId: appointment.id,
    });

    return appointment;
  }

  async findAll(query: ListAppointmentsDto) {
    const where: Prisma.AppointmentWhereInput = {
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
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async getCalendar(month: string) {
    // month format: YYYY-MM
    const date = new Date(`${month}-01`);
    if (isNaN(date.getTime())) {
      throw new BadRequestException('Invalid month format. Use YYYY-MM');
    }

    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        scheduledAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: {
        staff: { select: { fullName: true } },
        child: { select: { fullName: true, photoUrl: true } },
        parent: { select: { fullName: true, photoUrl: true } },
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

  async findOne(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
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
      throw new NotFoundException('Appointment not found');
    }

    return appointment;
  }

  async update(staffId: string, id: string, dto: UpdateAppointmentDto) {
    const existing = await this.findOne(id);

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
      message: `Appointment updated: ${updated.title} is now ${updated.status} and scheduled for ${updated.scheduledAt.toLocaleString()}.`,
      type: NotificationType.GENERAL,
      entityType: 'Appointment',
      entityId: updated.id,
    });

    return updated;
  }

  async remove(staffId: string, id: string) {
    const existing = await this.findOne(id);
    await this.prisma.appointment.delete({ where: { id } });
    await this.logAudit(staffId, 'DELETE', 'Appointment', id, null, existing);
    return { success: true };
  }

  // Attendance
  async logAttendance(staffId: string, appointmentId: string, dto: LogAttendanceDto) {
    const appointment = await this.findOne(appointmentId);

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

    await this.logAudit(staffId, 'LOG_ATTENDANCE', 'Appointment', appointmentId, {
      count: records.length,
      recordIds: records.map((r) => r.id),
    });

    await this.notifications.createNotification({
      staffId: appointment.staff.id,
      message: `Attendance logged: ${records.length} attendance record${records.length === 1 ? '' : 's'} for ${appointment.title}.`,
      type: NotificationType.GENERAL,
      entityType: 'Appointment',
      entityId: appointmentId,
    });

    return records;
  }

  async getAttendance(appointmentId: string) {
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
