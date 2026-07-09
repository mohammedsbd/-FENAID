import { Controller, Get, Patch, Param, Req } from '@nestjs/common';
import { ModuleAccess } from '../auth/decorators/module-access.decorator';
import { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@ModuleAccess('MY_ACCOUNT' as any)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.notificationsService.findAll(req.user.staffId);
  }

  @Get('mine')
  findMyUnread(@Req() req: AuthenticatedRequest) {
    return this.notificationsService.findMyUnread(req.user.staffId);
  }

  @Patch(':id/read')
  markAsRead(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.notificationsService.markAsRead(req.user.staffId, id);
  }

  @Patch('read-all')
  markAllAsRead(@Req() req: AuthenticatedRequest) {
    return this.notificationsService.markAllAsRead(req.user.staffId);
  }
}
