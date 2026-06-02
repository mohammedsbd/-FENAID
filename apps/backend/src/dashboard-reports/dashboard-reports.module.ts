import { Module } from '@nestjs/common';
import { DashboardReportsController } from './dashboard-reports.controller';
import { DashboardReportsService } from './dashboard-reports.service';

@Module({
  controllers: [DashboardReportsController],
  providers: [DashboardReportsService]
})
export class DashboardReportsModule {}
