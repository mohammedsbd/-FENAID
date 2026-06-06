import { Controller, Get, Query } from '@nestjs/common';
import { PermissionModule } from '@prisma/client';
import { ModuleAccess } from '../auth/decorators/module-access.decorator';
import { GlobalSearchDto } from './dto/global-search.dto';
import { SearchService } from './search.service';

@Controller('search')
@ModuleAccess(PermissionModule.DASHBOARD)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('global')
  global(@Query() query: GlobalSearchDto) {
    return this.searchService.global(query);
  }
}
