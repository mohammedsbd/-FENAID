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
  CreateFundAllocationDto,
  ListFundAllocationsDto,
  UpdateFundAllocationDto,
} from './dto/fund-allocation.dto';
import { FundAllocationsService } from './fund-allocations.service';

@Controller('fund-allocations')
@ModuleAccess('FINANCE' as any)
export class FundAllocationsController {
  constructor(private readonly fundAllocationsService: FundAllocationsService) {}

  @Post()
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.CASE_WORKER)
  create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateFundAllocationDto,
  ) {
    return this.fundAllocationsService.create(req.user.staffId, dto);
  }

  @Get()
  findAll(@Query() query: ListFundAllocationsDto) {
    return this.fundAllocationsService.findAll(query);
  }

  @Get('parent/:parentId')
  findByParent(@Param('parentId') parentId: string) {
    return this.fundAllocationsService.findByParent(parentId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.fundAllocationsService.findOne(id);
  }

  @Patch(':id')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.CASE_WORKER)
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateFundAllocationDto,
  ) {
    return this.fundAllocationsService.update(req.user.staffId, id, dto);
  }
}
