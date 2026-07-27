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
import { ChildrenService } from './children.service';
import { CreateChildDto } from './dto/create-child.dto';
import { ListChildrenDto } from './dto/list-children.dto';
import { UpdateChildDto } from './dto/update-child.dto';

@Controller('children')
@ModuleAccess('CHILDREN' as any)
export class ChildrenController {
  constructor(private readonly childrenService: ChildrenService) {}

  @Post()
  @Idempotent()
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.CASE_WORKER)
  create(
    @Req() request: AuthenticatedRequest,
    @Body() createChildDto: CreateChildDto,
  ) {
    return this.childrenService.create(request.user.staffId, createChildDto);
  }

  @Get()
  findAll(@Req() request: AuthenticatedRequest, @Query() query: ListChildrenDto) {
    return this.childrenService.findAll(request.user, query);
  }

  @Get(':id')
  findOne(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.childrenService.findOne(request.user, id);
  }

  @Patch(':id')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.CASE_WORKER)
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateChildDto: UpdateChildDto,
  ) {
    return this.childrenService.update(request.user.staffId, id, updateChildDto);
  }

  @Delete(':id')
  @Roles(StaffRole.SUPER_ADMIN)
  remove(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.childrenService.remove(request.user.staffId, id);
  }
}
