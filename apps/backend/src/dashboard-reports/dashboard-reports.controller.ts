import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import { DashboardReportsService } from './dashboard-reports.service';
import { ReportQueryDto, ReportType } from './dto/report-query.dto';

@Controller()
export class DashboardReportsController {
  constructor(private readonly dashboardService: DashboardReportsService) {}

  @Get('dashboard/admin')
  @Roles(StaffRole.SUPER_ADMIN)
  getAdminDashboard() {
    return this.dashboardService.getAdminDashboard();
  }

  @Get('dashboard/staff')
  getStaffDashboard(@Req() req: AuthenticatedRequest) {
    return this.dashboardService.getStaffDashboard(req.user.staffId);
  }

  @Get('reports/:type')
  getReport(
    @Param('type') type: ReportType,
    @Query() query: ReportQueryDto,
  ) {
    return this.dashboardService.generateReport(type, query);
  }
}
