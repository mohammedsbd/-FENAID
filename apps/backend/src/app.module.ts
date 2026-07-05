import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ChildrenModule } from './children/children.module';
import { ParentsModule } from './parents/parents.module';
import { PrismaModule } from './prisma/prisma.module';
import { FundAllocationsModule } from './fund-allocations/fund-allocations.module';
import { DonationsModule } from './donations/donations.module';
import { ServicesModule } from './services/services.module';
import { ProgressTrackingModule } from './progress-tracking/progress-tracking.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { DashboardReportsModule } from './dashboard-reports/dashboard-reports.module';
import { DocumentsModule } from './documents/documents.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AccountsModule } from './accounts/accounts.module';
import { SearchModule } from './search/search.module';
import { SettingsModule } from './settings/settings.module';
import { DataQueryModule } from './data-query/data-query.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    ThrottlerModule.forRoot([{
      name: 'default',
      ttl: 60000,
      limit: 100,
    }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    ParentsModule,
    ChildrenModule,
    FundAllocationsModule,
    DonationsModule,
    ServicesModule,
    ProgressTrackingModule,
    AppointmentsModule,
    DashboardReportsModule,
    DocumentsModule,
    NotificationsModule,
    AccountsModule,
    SearchModule,
    SettingsModule,
    DataQueryModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
