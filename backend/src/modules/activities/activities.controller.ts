import { Controller, Get, Patch, Post, Param, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@Controller()
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post('companies/:companyId/activities')
  create(@Param('companyId') companyId: string, @Body() dto: CreateActivityDto) {
    return this.activitiesService.create(companyId, dto);
  }

  @Get('companies/:companyId/activities')
  findAllByCompany(@Param('companyId') companyId: string) {
    return this.activitiesService.findAllByCompany(companyId);
  }

  @Get('activities/:id')
  findOne(@Param('id') id: string) {
    return this.activitiesService.findOne(id);
  }

  @Patch('activities/:id')
  update(@Param('id') id: string, @Body() dto: UpdateActivityDto) {
    return this.activitiesService.update(id, dto);
  }
}
