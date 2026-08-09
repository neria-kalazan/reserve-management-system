import { Controller, Post, Param, NotFoundException, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/permission.decorator';
import { UserImportService } from './user-import.service';

@UseGuards(AuthGuard, PermissionGuard)
@RequirePermission('MANAGE_COMPANIES')
@Controller()
export class UserImportController {
  constructor(private readonly importService: UserImportService) {}

  @Post('companies/:companyId/users/import')
  @UseInterceptors(FileInterceptor('file'))
  async import(@Param('companyId') companyId: string, @UploadedFile() file: any) {
    if (!file) throw new NotFoundException('No file uploaded');
    const buffer: Buffer = file.buffer ?? (await import('fs')).promises.readFile(file.path);
    return this.importService.importFromBuffer(companyId, buffer);
  }
}
