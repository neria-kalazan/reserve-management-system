import { Module } from '@nestjs/common';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { TaskValidationService } from '../task-instances/task-validation.service';

@Module({
  controllers: [AssignmentsController],
  providers: [AssignmentsService, TaskValidationService],
})
export class AssignmentsModule {}
