import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import { Idempotent } from '../common/decorators/idempotent.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ModuleAccess } from '../auth/decorators/module-access.decorator';
import { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import { AppointmentsService } from './appointments.service';
import {
  CreateAppointmentDto,
  ListAppointmentsDto,
  LogAttendanceDto,
  UpdateAppointmentDto,
} from './dto/appointment.dto';

@Controller('appointments')
@ModuleAccess('APPOINTMENTS' as any)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @Idempotent()
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.CASE_WORKER)
  create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.create(req.user.staffId, dto);
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest, @Query() query: ListAppointmentsDto) {
    return this.appointmentsService.findAll(req.user, query);
  }

  @Get('calendar')
  getCalendar(@Req() req: AuthenticatedRequest, @Query('month') month: string, @Query() query: ListAppointmentsDto) {
    return this.appointmentsService.getCalendar(req.user, month, query);
  }

  @Get(':id')
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.appointmentsService.findOne(req.user, id);
  }

  @Patch(':id')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.CASE_WORKER)
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(req.user.staffId, id, dto);
  }

  @Delete(':id')
  @Roles(StaffRole.SUPER_ADMIN)
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.appointmentsService.remove(req.user.staffId, id);
  }

  // Attendance
  @Post(':id/attendance')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.CASE_WORKER)
  logAttendance(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: LogAttendanceDto,
  ) {
    return this.appointmentsService.logAttendance(req.user.staffId, id, dto);
  }

  @Get(':id/attendance')
  getAttendance(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.appointmentsService.getAttendance(req.user, id);
  }
}
