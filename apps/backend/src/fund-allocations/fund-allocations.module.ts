import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { FundAllocationsController } from './fund-allocations.controller';
import { FundAllocationsService } from './fund-allocations.service';

@Module({
  imports: [NotificationsModule],
  controllers: [FundAllocationsController],
  providers: [FundAllocationsService]
})
export class FundAllocationsModule {}
