import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import { DataQueryService } from './data-query.service';
import { RunQueryDto } from './dto/run-query.dto';
import {
  RunSavedQueryDto,
  SaveQueryDto,
  UpdateSavedQueryDto,
} from './dto/save-query.dto';

@Controller('data-query')
@Roles(StaffRole.SUPER_ADMIN, StaffRole.CASE_WORKER)
export class DataQueryController {
  constructor(private readonly dataQueryService: DataQueryService) {}

  @Post('run')
  run(@Req() req: AuthenticatedRequest, @Body() dto: RunQueryDto) {
    return this.dataQueryService.runQuery(
      req.user.staffId,
      dto,
      requestMeta(req),
    );
  }

  @Post('export')
  export(@Req() req: AuthenticatedRequest, @Body() dto: RunQueryDto) {
    return this.dataQueryService.exportQuery(
      req.user.staffId,
      req.user.role,
      dto,
      requestMeta(req),
    );
  }

  @Get('statistics')
  statistics() {
    return this.dataQueryService.getStatistics();
  }

  @Get('statistics/export')
  exportStatistics(@Req() req: AuthenticatedRequest) {
    return this.dataQueryService.exportStatistics(
      req.user.staffId,
      requestMeta(req),
    );
  }

  @Get('staff')
  staff() {
    return this.dataQueryService.listStaff();
  }

  @Get('permissions')
  permissions(@Req() req: AuthenticatedRequest) {
    return this.dataQueryService.getExportPermissions(req.user.staffId, req.user.role);
  }

  @Post('saved')
  save(@Req() req: AuthenticatedRequest, @Body() dto: SaveQueryDto) {
    return this.dataQueryService.saveQuery(req.user.staffId, dto);
  }

  @Get('saved')
  listSaved(@Req() req: AuthenticatedRequest) {
    return this.dataQueryService.listSavedQueries(req.user.staffId);
  }

  @Get('saved/:id')
  getSaved(@Param('id') id: string) {
    return this.dataQueryService.getSavedQuery(id);
  }

  @Put('saved/:id')
  updateSaved(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateSavedQueryDto,
  ) {
    return this.dataQueryService.updateSavedQuery(
      req.user.staffId,
      req.user.role,
      id,
      dto,
    );
  }

  @Delete('saved/:id')
  deleteSaved(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.dataQueryService.deleteSavedQuery(
      req.user.staffId,
      req.user.role,
      id,
    );
  }

  @Post('saved/:id/run')
  runSaved(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: RunSavedQueryDto,
  ) {
    return this.dataQueryService.runSavedQuery(
      req.user.staffId,
      id,
      body,
      requestMeta(req),
    );
  }
}

function requestMeta(request: Request) {
  return {
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
  };
}
