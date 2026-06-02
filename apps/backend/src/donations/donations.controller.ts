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
import { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import { DonationsService } from './donations.service';
import {
  CreateDonationDto,
  ListDonationsDto,
  UpdateDonationDto,
} from './dto/donation.dto';

@Controller('donations')
export class DonationsController {
  constructor(private readonly donationsService: DonationsService) {}

  @Post()
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.CASE_WORKER)
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateDonationDto) {
    return this.donationsService.create(req.user.staffId, dto);
  }

  @Get('summary')
  getSummary() {
    return this.donationsService.getSummary();
  }

  @Get()
  findAll(@Query() query: ListDonationsDto) {
    return this.donationsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.donationsService.findOne(id);
  }

  @Patch(':id')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.CASE_WORKER)
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateDonationDto,
  ) {
    return this.donationsService.update(req.user.staffId, id, dto);
  }
}
