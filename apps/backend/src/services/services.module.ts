import { Module } from '@nestjs/common';
import { ServiceAssignmentsController } from './service-assignments.controller';
import { ServiceAssignmentsService } from './service-assignments.service';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';

@Module({
  controllers: [ServicesController, ServiceAssignmentsController],
  providers: [ServicesService, ServiceAssignmentsService],
})
export class ServicesModule {}
