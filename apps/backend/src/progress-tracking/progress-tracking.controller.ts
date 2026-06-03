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
import { ModuleAccess } from '../auth/decorators/module-access.decorator';
import { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import {
  CreateGoalDto,
  CreateMilestoneDto,
  CreateProgressNoteDto,
  ListGoalsDto,
  ListProgressNotesDto,
  UpdateGoalDto,
  UpdateMilestoneDto,
} from './dto/progress-tracking.dto';
import { ProgressTrackingService } from './progress-tracking.service';

@Controller('progress')
@ModuleAccess('CHILDREN' as any)
export class ProgressTrackingController {
  constructor(private readonly progressService: ProgressTrackingService) {}

  // Progress Notes
  @Post('notes')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.CASE_WORKER)
  createNote(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateProgressNoteDto,
  ) {
    return this.progressService.createProgressNote(req.user.staffId, dto);
  }

  @Get('notes/child/:childId')
  findNotesByChild(
    @Param('childId') childId: string,
    @Query() query: ListProgressNotesDto,
  ) {
    return this.progressService.findProgressNotesByChild(childId, query);
  }

  // Milestones
  @Post('milestones')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.CASE_WORKER)
  createMilestone(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.progressService.createMilestone(req.user.staffId, dto);
  }

  @Get('milestones/child/:childId')
  findMilestonesByChild(@Param('childId') childId: string) {
    return this.progressService.findMilestonesByChild(childId);
  }

  @Patch('milestones/:id')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.CASE_WORKER)
  updateMilestone(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateMilestoneDto,
  ) {
    return this.progressService.updateMilestone(req.user.staffId, id, dto);
  }

  // Goals
  @Post('goals')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.CASE_WORKER)
  createGoal(@Req() req: AuthenticatedRequest, @Body() dto: CreateGoalDto) {
    return this.progressService.createGoal(req.user.staffId, dto);
  }

  @Get('goals/child/:childId')
  findGoalsByChild(
    @Param('childId') childId: string,
    @Query() query: ListGoalsDto,
  ) {
    return this.progressService.findGoalsByChild(childId, query);
  }

  @Patch('goals/:id')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.CASE_WORKER)
  updateGoal(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateGoalDto,
  ) {
    return this.progressService.updateGoal(req.user.staffId, id, dto);
  }

  @Delete('goals/:id')
  @Roles(StaffRole.SUPER_ADMIN)
  removeGoal(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.progressService.removeGoal(req.user.staffId, id);
  }
}
