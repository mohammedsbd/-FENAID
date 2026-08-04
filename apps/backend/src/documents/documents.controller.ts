import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { StaffRole } from '@prisma/client';
import { Idempotent } from '../common/decorators/idempotent.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ModuleAccess } from '../auth/decorators/module-access.decorator';
import { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/document.dto';

const documentStorage = diskStorage({
  destination: (_req, _file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads', 'documents');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const sanitizedBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${sanitizedBase}-${uniqueSuffix}${ext}`);
  },
});

@Controller('documents')
@ModuleAccess('DOCUMENTS' as any)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @Idempotent()
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.CASE_WORKER)
  @UseInterceptors(FileInterceptor('file', { storage: documentStorage, limits: { fileSize: 50 * 1024 * 1024 } }))
  create(
    @Req() req: AuthenticatedRequest,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let fileUrl = body.fileUrl;
    if (file) {
      fileUrl = `/uploads/documents/${file.filename}`;
    }

    if (!fileUrl) {
      throw new BadRequestException('File or fileUrl is required.');
    }

    const name = body.title || body.name || (file ? file.originalname : 'Document');
    const category = body.category || 'OTHER';

    const dto: CreateDocumentDto = {
      name,
      category,
      fileUrl,
      expiresAt: body.expiresAt || undefined,
      parentId: body.parentId || undefined,
      childId: body.childId || undefined,
    };

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
