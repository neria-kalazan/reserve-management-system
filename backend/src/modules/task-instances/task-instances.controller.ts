import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/permission.decorator';
import { TaskInstancesService } from './task-instances.service';
import { CreateTaskInstanceDto } from './dto/create-task-instance.dto';
import { BulkCreateTaskInstancesDto } from './dto/bulk-create-task-instances.dto';
import { UpdateTaskInstanceDto } from './dto/update-task-instance.dto';

@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@UseGuards(AuthGuard, PermissionGuard)
@RequirePermission('MANAGE_COMPANIES')
@Controller()
export class TaskInstancesController {
  constructor(private readonly taskInstancesService: TaskInstancesService) {}

  @Post('activity-tasks/:activityTaskId/task-instances')
  create(@Param('activityTaskId') activityTaskId: string, @Body() dto: CreateTaskInstanceDto) {
    return this.taskInstancesService.create(activityTaskId, dto);
  }

  @Post('activity-tasks/:activityTaskId/task-instances/bulk')
  bulkCreate(@Param('activityTaskId') activityTaskId: string, @Body() dto: BulkCreateTaskInstancesDto) {
    return this.taskInstancesService.bulkCreate(activityTaskId, dto);
  }

  @Get('activity-tasks/:activityTaskId/task-instances')
  findAllByActivityTask(@Param('activityTaskId') activityTaskId: string) {
    return this.taskInstancesService.findAllByActivityTask(activityTaskId);
  }

  @Get('task-instances/:id')
  findOne(@Param('id') id: string) {
    return this.taskInstancesService.findOne(id);
  }

  @Get('task-instances/:taskInstanceId/available-users')
  findAvailableUsers(@Param('taskInstanceId') taskInstanceId: string) {
    return this.taskInstancesService.findAvailableUsers(taskInstanceId);
  }

  @Get('task-instances/:taskInstanceId/candidates/:userId/evaluation')
  evaluateCandidate(@Param('taskInstanceId') taskInstanceId: string, @Param('userId') userId: string) {
    return this.taskInstancesService.evaluateCandidate(taskInstanceId, userId);
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
