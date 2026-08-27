import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { ActivitySchedulingDayService } from './activity-scheduling-day.service';
import { TaskValidationService } from '../task-instances/task-validation.service';
import { TaskInstancesService } from '../task-instances/task-instances.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ActivitiesController],
  providers: [ActivitiesService, ActivitySchedulingDayService, TaskValidationService, TaskInstancesService],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
