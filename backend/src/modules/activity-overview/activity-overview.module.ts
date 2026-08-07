import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ActivityOverviewController } from './activity-overview.controller';
import { ActivityOverviewService } from './activity-overview.service';
import { TaskValidationService } from '../task-instances/task-validation.service';

@Module({
  imports: [PrismaModule],
  controllers: [ActivityOverviewController],
  providers: [ActivityOverviewService, TaskValidationService],
  exports: [ActivityOverviewService],
})
export class ActivityOverviewModule {}
