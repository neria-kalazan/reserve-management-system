import { Module } from '@nestjs/common';
import { TaskInstancesController } from './task-instances.controller';
import { TaskInstancesService } from './task-instances.service';
import { TaskValidationController } from './task-validation.controller';
import { TaskValidationService } from './task-validation.service';

@Module({
  controllers: [TaskInstancesController, TaskValidationController],
  providers: [TaskInstancesService, TaskValidationService],
})
export class TaskInstancesModule {}
