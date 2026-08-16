import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/permission.decorator';
import { QualificationsService } from './qualifications.service';
import { CreateQualificationDto } from './dto/create-qualification.dto';
import { UpdateQualificationDto } from './dto/update-qualification.dto';
import { FindCompanyQualificationsQueryDto } from './dto/find-company-qualifications-query.dto';

@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@UseGuards(AuthGuard, PermissionGuard)
@RequirePermission('MANAGE_COMPANIES')
@Controller()
export class QualificationsController {
  constructor(private readonly qualificationsService: QualificationsService) {}

  @Post('companies/:companyId/qualifications')
  create(@Param('companyId') companyId: string, @Body() dto: CreateQualificationDto) {
    return this.qualificationsService.create(companyId, dto);
  }

  @Get('companies/:companyId/qualifications')
  findAllByCompany(
    @Param('companyId') companyId: string,
    @Query() query: FindCompanyQualificationsQueryDto,
  ) {
    return this.qualificationsService.findAllByCompany(companyId, query);
  }

  @Get('qualifications/:id')
  findOne(@Param('id') id: string) {
    return this.qualificationsService.findOne(id);
  }

  @Patch('qualifications/:id')
  update(@Param('id') id: string, @Body() dto: UpdateQualificationDto) {
    return this.qualificationsService.update(id, dto);
  }

  @Delete('qualifications/:id')
  remove(@Param('id') id: string) {
    return this.qualificationsService.delete(id);
  }
}
