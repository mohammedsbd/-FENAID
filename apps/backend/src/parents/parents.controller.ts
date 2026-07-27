import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import { Idempotent } from '../common/decorators/idempotent.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ModuleAccess } from '../auth/decorators/module-access.decorator';
import { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import { CreateParentDto } from './dto/create-parent.dto';
import { ListParentsDto } from './dto/list-parents.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { ParentsService } from './parents.service';

@Controller('parents')
@ModuleAccess('PARENTS' as any)
export class ParentsController {
  constructor(private readonly parentsService: ParentsService) {}

  @Post()
  @Idempotent()
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.CASE_WORKER)
  create(
    @Req() request: AuthenticatedRequest,
    @Body() createParentDto: CreateParentDto,
  ) {
    return this.parentsService.create(request.user.staffId, createParentDto);
  }

  @Get()
  findAll(@Req() request: AuthenticatedRequest, @Query() query: ListParentsDto) {
    return this.parentsService.findAll(request.user, query);
  }

  @Get(':id')
  findOne(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.parentsService.findOne(request.user, id);
  }

  @Patch(':id')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.CASE_WORKER)
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateParentDto: UpdateParentDto,
  ) {
    return this.parentsService.update(
      request.user.staffId,
      id,
      updateParentDto,
    );
  }

  @Delete(':id')
  @Roles(StaffRole.SUPER_ADMIN)
  remove(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.parentsService.remove(request.user.staffId, id);
  }
}
