import { Controller, Get, Param, UsePipes, ValidationPipe } from '@nestjs/common';
import { TaskWorkspaceService } from './task-workspace.service';

@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@Controller()
export class TaskWorkspaceController {
  constructor(private readonly taskWorkspaceService: TaskWorkspaceService) {}

  @Get('task-instances/:taskInstanceId/workspace')
  getWorkspace(@Param('taskInstanceId') taskInstanceId: string) {
    return this.taskWorkspaceService.getWorkspace(taskInstanceId);
  }
}
