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
import {
  CreateBulkReferralDto,
  CreateReferralDto,
  ListReferralsDto,
  UpdateReferralDto,
} from './dto/referral.dto';
import { ReferralsService } from './referrals.service';

@Controller('referrals')
@ModuleAccess('REFERRALS' as any)
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Post('bulk')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.CASE_WORKER)
  createBulk(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateBulkReferralDto,
  ) {
    return this.referralsService.createBulk(req.user.staffId, dto);
  }

  @Post()
  @Idempotent()
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.CASE_WORKER)
  create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateReferralDto,
  ) {
    return this.referralsService.create(req.user.staffId, dto);
  }

  @Get()
  findAll(@Query() query: ListReferralsDto) {
    return this.referralsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.referralsService.findOne(id);
  }

  @Patch(':id')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.CASE_WORKER)
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateReferralDto,
  ) {
    return this.referralsService.update(req.user.staffId, id, dto);
  }

  @Delete(':id')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.CASE_WORKER)
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.referralsService.remove(req.user.staffId, id);
  }
}
