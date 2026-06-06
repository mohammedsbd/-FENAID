import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProgressTrackingController } from './progress-tracking.controller';
import { ProgressTrackingService } from './progress-tracking.service';

@Module({
  imports: [NotificationsModule],
  controllers: [ProgressTrackingController],
  providers: [ProgressTrackingService]
})
export class ProgressTrackingModule {}
