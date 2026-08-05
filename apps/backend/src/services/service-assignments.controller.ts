import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { ModuleAccess } from '../auth/decorators/module-access.decorator';
import { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import {
  CreateBulkServiceAssignmentDto,
  CreateServiceAssignmentDto,
  ListServiceAssignmentsDto,
  UpdateServiceAssignmentDto,
} from './dto/service-assignment.dto';
import { ServiceAssignmentsService } from './service-assignments.service';

@Controller('service-assignments')
@ModuleAccess('SERVICES' as any)
export class ServiceAssignmentsController {
  constructor(
    private readonly serviceAssignmentsService: ServiceAssignmentsService,
  ) {}

  @Post('bulk')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.CASE_WORKER)
  createBulk(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateBulkServiceAssignmentDto,
  ) {
    return this.serviceAssignmentsService.createBulk(req.user.staffId, dto);
  }

  @Post()
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.CASE_WORKER)
  create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateServiceAssignmentDto,
  ) {
    return this.serviceAssignmentsService.create(req.user.staffId, dto);
  }

  @Get()
  findAll(@Query() query: ListServiceAssignmentsDto) {
    return this.serviceAssignmentsService.findAll(query);
  }

  @Get('parent/:parentId')
  findByParent(@Param('parentId') parentId: string) {
    return this.serviceAssignmentsService.findByParent(parentId);
  }

  @Get('child/:childId')
  findByChild(@Param('childId') childId: string) {
    return this.serviceAssignmentsService.findByChild(childId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.serviceAssignmentsService.findOne(id);
  }

  @Patch(':id')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.CASE_WORKER)
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateServiceAssignmentDto,
  ) {
    return this.serviceAssignmentsService.update(req.user.staffId, id, dto);
  }
}
