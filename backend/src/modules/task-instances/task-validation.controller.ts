import { Controller, Get, Param, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/permission.decorator';
import { TaskValidationService } from './task-validation.service';

@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@UseGuards(AuthGuard, PermissionGuard)
@RequirePermission('MANAGE_COMPANIES')
@Controller()
export class TaskValidationController {
  constructor(private readonly taskValidationService: TaskValidationService) {}

  @Get('task-instances/:taskInstanceId/validation')
  validate(@Param('taskInstanceId') taskInstanceId: string) {
    return this.taskValidationService.validate(taskInstanceId);
  }
}
