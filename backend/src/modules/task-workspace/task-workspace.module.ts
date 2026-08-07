import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TaskWorkspaceController } from './task-workspace.controller';
import { TaskWorkspaceService } from './task-workspace.service';
import { TaskValidationService } from '../task-instances/task-validation.service';
import { TaskInstancesService } from '../task-instances/task-instances.service';

@Module({
  imports: [PrismaModule],
  controllers: [TaskWorkspaceController],
  providers: [TaskWorkspaceService, TaskValidationService, TaskInstancesService],
  exports: [TaskWorkspaceService],
})
export class TaskWorkspaceModule {}
