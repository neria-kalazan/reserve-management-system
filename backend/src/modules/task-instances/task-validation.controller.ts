import { Controller, Get, Param, UsePipes, ValidationPipe } from '@nestjs/common';
import { TaskValidationService } from './task-validation.service';

@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@Controller()
export class TaskValidationController {
  constructor(private readonly taskValidationService: TaskValidationService) {}

  @Get('task-instances/:taskInstanceId/validation')
  validate(@Param('taskInstanceId') taskInstanceId: string) {
    return this.taskValidationService.validate(taskInstanceId);
  }
}
