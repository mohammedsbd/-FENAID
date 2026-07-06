import { Controller, Get, Query, Req } from '@nestjs/common';
import { PermissionModule } from '@prisma/client';
import { ModuleAccess } from '../auth/decorators/module-access.decorator';
import { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import { GlobalSearchDto } from './dto/global-search.dto';
import { SearchService } from './search.service';

@Controller('search')
@ModuleAccess(PermissionModule.DASHBOARD)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('global')
  global(@Req() request: AuthenticatedRequest, @Query() query: GlobalSearchDto) {
    return this.searchService.global(request.user, query);
  }
}
