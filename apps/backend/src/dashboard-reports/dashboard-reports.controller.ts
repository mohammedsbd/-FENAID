import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { ModuleAccess } from '../auth/decorators/module-access.decorator';
import { StaffRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import { DashboardReportsService } from './dashboard-reports.service';
import { ReportQueryDto, ReportType } from './dto/report-query.dto';

@Controller('dashboard')
@ModuleAccess('DASHBOARD' as any)
export class DashboardReportsController {
  constructor(private readonly dashboardService: DashboardReportsService) {}

  @Get('admin')
  @Roles(StaffRole.SUPER_ADMIN)
  getAdminDashboard() {
    return this.dashboardService.getAdminDashboard();
  }

  @Get('staff')
  getStaffDashboard(@Req() req: AuthenticatedRequest) {
    return this.dashboardService.getStaffDashboard(req.user.staffId);
  }

  @Get('reports/:type')
  @ModuleAccess('REPORTS' as any)
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.VIEWER)
  getReport(
    @Req() req: AuthenticatedRequest,
    @Param('type') type: ReportType,
    @Query() query: ReportQueryDto,
  ) {
    return this.dashboardService.generateReport(req.user, type, query);
  }
}
