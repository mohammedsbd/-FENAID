import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { ModuleAccess } from '../auth/decorators/module-access.decorator';
import { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/document.dto';

@Controller('documents')
@ModuleAccess('DOCUMENTS' as any)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.CASE_WORKER)
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateDocumentDto) {
    return this.documentsService.create(req.user.staffId, dto);
  }

  @Get('parent/:parentId')
  findByParent(@Req() req: AuthenticatedRequest, @Param('parentId') parentId: string) {
    return this.documentsService.findByParent(req.user, parentId);
  }

  @Get('child/:childId')
  findByChild(@Req() req: AuthenticatedRequest, @Param('childId') childId: string) {
    return this.documentsService.findByChild(req.user, childId);
  }

  @Delete(':id')
  @Roles(StaffRole.SUPER_ADMIN)
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.documentsService.remove(req.user.staffId, id);
  }
}
