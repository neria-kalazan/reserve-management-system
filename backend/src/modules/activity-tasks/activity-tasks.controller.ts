import { Controller, Get, Patch, Post, Param, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { ActivityTasksService } from './activity-tasks.service';
import { CreateActivityTaskDto } from './dto/create-activity-task.dto';
import { UpdateActivityTaskDto } from './dto/update-activity-task.dto';

@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@Controller()
export class ActivityTasksController {
  constructor(private readonly activityTasksService: ActivityTasksService) {}

  @Post('activities/:activityId/tasks')
  create(@Param('activityId') activityId: string, @Body() dto: CreateActivityTaskDto) {
    return this.activityTasksService.create(activityId, dto);
  }

  @Get('activities/:activityId/tasks')
  findAllByActivity(@Param('activityId') activityId: string) {
    return this.activityTasksService.findAllByActivity(activityId);
  }

  @Get('activity-tasks/:id')
  findOne(@Param('id') id: string) {
    return this.activityTasksService.findOne(id);
  }

  @Patch('activity-tasks/:id')
  update(@Param('id') id: string, @Body() dto: UpdateActivityTaskDto) {
    return this.activityTasksService.update(id, dto);
  }
}
