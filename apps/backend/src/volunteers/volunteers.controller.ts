import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import { Idempotent } from '../common/decorators/idempotent.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ModuleAccess } from '../auth/decorators/module-access.decorator';
import { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import { VolunteersService } from './volunteers.service';
import { CreateVolunteerDto, UpdateVolunteerDto, CreateVolunteerServiceDto } from './dto/volunteer.dto';

@Controller('volunteers')
@ModuleAccess('VOLUNTEERS' as any)
export class VolunteersController {
  constructor(private readonly volunteersService: VolunteersService) {}

  @Post()
  @Idempotent()
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.CASE_WORKER)
  create(
    @Req() request: AuthenticatedRequest,
    @Body() createVolunteerDto: CreateVolunteerDto,
  ) {
    return this.volunteersService.create(request.user.staffId, createVolunteerDto);
  }

  @Get()
  findAll(@Query('search') search?: string) {
    return this.volunteersService.findAll(search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.volunteersService.findOne(id);
  }

  @Patch(':id')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.CASE_WORKER)
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateVolunteerDto: UpdateVolunteerDto,
  ) {
    return this.volunteersService.update(request.user.staffId, id, updateVolunteerDto);
  }

  @Delete(':id')
  @Roles(StaffRole.SUPER_ADMIN)
  remove(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.volunteersService.remove(request.user.staffId, id);
  }

  @Post(':id/services')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.CASE_WORKER)
  addService(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() createVolunteerServiceDto: CreateVolunteerServiceDto,
  ) {
    return this.volunteersService.addService(request.user.staffId, id, createVolunteerServiceDto);
  }

  @Delete('services/:serviceId')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.CASE_WORKER)
  removeService(
    @Req() request: AuthenticatedRequest,
    @Param('serviceId') serviceId: string,
  ) {
    return this.volunteersService.removeService(request.user.staffId, serviceId);
  }
}
