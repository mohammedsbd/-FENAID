import { Module } from '@nestjs/common';
import { FundAllocationsController } from './fund-allocations.controller';
import { FundAllocationsService } from './fund-allocations.service';

@Module({
  controllers: [FundAllocationsController],
  providers: [FundAllocationsService]
})
export class FundAllocationsModule {}
