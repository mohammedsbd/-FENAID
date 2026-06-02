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
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import { ChildrenService } from './children.service';
import { CreateChildDto } from './dto/create-child.dto';
import { ListChildrenDto } from './dto/list-children.dto';
import { UpdateChildDto } from './dto/update-child.dto';

@Controller('children')
export class ChildrenController {
  constructor(private readonly childrenService: ChildrenService) {}

  @Post()
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.CASE_WORKER)
  create(
    @Req() request: AuthenticatedRequest,
    @Body() createChildDto: CreateChildDto,
  ) {
    return this.childrenService.create(request.user.staffId, createChildDto);
  }

  @Get()
  findAll(@Query() query: ListChildrenDto) {
    return this.childrenService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.childrenService.findOne(id);
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
