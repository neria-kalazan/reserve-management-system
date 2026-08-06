import { Body, Controller, Delete, Get, Param, Patch, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { TaskInstancesService } from './task-instances.service';
import { CreateTaskInstanceDto } from './dto/create-task-instance.dto';
import { UpdateTaskInstanceDto } from './dto/update-task-instance.dto';

@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@Controller()
export class TaskInstancesController {
  constructor(private readonly taskInstancesService: TaskInstancesService) {}

  @Post('activity-tasks/:activityTaskId/task-instances')
  create(@Param('activityTaskId') activityTaskId: string, @Body() dto: CreateTaskInstanceDto) {
    return this.taskInstancesService.create(activityTaskId, dto);
  }

  @Get('activity-tasks/:activityTaskId/task-instances')
  findAllByActivityTask(@Param('activityTaskId') activityTaskId: string) {
    return this.taskInstancesService.findAllByActivityTask(activityTaskId);
  }

  @Get('task-instances/:id')
  findOne(@Param('id') id: string) {
    return this.taskInstancesService.findOne(id);
  }

  @Patch('task-instances/:id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskInstanceDto) {
    return this.taskInstancesService.update(id, dto);
  }

  @Delete('task-instances/:id')
  delete(@Param('id') id: string) {
    return this.taskInstancesService.delete(id);
  }
}
