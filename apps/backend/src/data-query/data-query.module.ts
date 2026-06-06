import { Module } from '@nestjs/common';
import { DataQueryController } from './data-query.controller';
import { DataQueryService } from './data-query.service';

@Module({
  controllers: [DataQueryController],
  providers: [DataQueryService],
})
export class DataQueryModule {}
