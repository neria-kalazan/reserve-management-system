import { Controller, Get, Post, Patch, Delete, Param, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { QualificationsService } from './qualifications.service';
import { CreateQualificationDto } from './dto/create-qualification.dto';
import { UpdateQualificationDto } from './dto/update-qualification.dto';

@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@Controller()
export class QualificationsController {
  constructor(private readonly qualificationsService: QualificationsService) {}

  @Post('companies/:companyId/qualifications')
  create(@Param('companyId') companyId: string, @Body() dto: CreateQualificationDto) {
    return this.qualificationsService.create(companyId, dto);
  }

  @Get('companies/:companyId/qualifications')
  findAllByCompany(@Param('companyId') companyId: string) {
    return this.qualificationsService.findAllByCompany(companyId);
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
