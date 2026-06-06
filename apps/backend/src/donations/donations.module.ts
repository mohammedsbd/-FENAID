import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { DonationsController } from './donations.controller';
import { DonationsService } from './donations.service';

@Module({
  imports: [NotificationsModule],
  controllers: [DonationsController],
  providers: [DonationsService]
})
export class DonationsModule {}
