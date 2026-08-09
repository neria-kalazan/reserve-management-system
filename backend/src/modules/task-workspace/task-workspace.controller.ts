import { Controller, Get, Param, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/permission.decorator';
import { TaskWorkspaceService } from './task-workspace.service';

@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@UseGuards(AuthGuard, PermissionGuard)
@RequirePermission('MANAGE_COMPANIES')
@Controller()
export class TaskWorkspaceController {
  constructor(private readonly taskWorkspaceService: TaskWorkspaceService) {}

  @Get('task-instances/:taskInstanceId/workspace')
  getWorkspace(@Param('taskInstanceId') taskInstanceId: string) {
    return this.taskWorkspaceService.getWorkspace(taskInstanceId);
  }
}
