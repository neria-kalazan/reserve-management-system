import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { TaskInstancesController } from './task-instances.controller';
import { TaskInstancesService } from './task-instances.service';
import { TaskValidationController } from './task-validation.controller';
import { TaskValidationService } from './task-validation.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [TaskInstancesController, TaskValidationController],
  providers: [TaskInstancesService, TaskValidationService],
})
export class TaskInstancesModule {}
